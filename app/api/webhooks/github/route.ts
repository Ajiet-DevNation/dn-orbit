import { after, type NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { markGithubDirty } from "@/lib/sync";
import {
  HANDLED_EVENTS,
  SIGNATURE_HEADER,
  senderLogin,
  verifyGithubSignature,
} from "@/lib/webhook-signature";

// GitHub org webhook → priority refresh for the member who acted.
//
// This is what makes the leaderboard reflect real activity in seconds rather
// than on a fixed tick: a push marks that member dirty, and the next visitor's
// /api/sync drain picks them up first. We deliberately do NOT fetch anything
// here — a webhook handler that made outbound API calls would turn a burst of
// pushes into a burst of GitHub requests, which is exactly what the drip queue
// exists to avoid.
//
// Setup (once, by an org admin):
//   GitHub org → Settings → Webhooks → Add webhook
//   Payload URL:  https://<site>/api/webhooks/github
//   Content type: application/json
//   Secret:       the value of GITHUB_WEBHOOK_SECRET
//   Events:       Pushes, Pull requests, Branch or tag creation

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Must read the RAW body: re-serialising parsed JSON changes the bytes and
  // the HMAC would never match.
  const raw = await req.text();

  const verified = verifyGithubSignature(
    raw,
    req.headers.get(SIGNATURE_HEADER),
    process.env.GITHUB_WEBHOOK_SECRET,
  );

  if (!verified.ok) {
    if (verified.reason === "no-secret") {
      // Misconfiguration, not an attack — say so distinctly in the logs, but
      // still refuse. Failing open here would let anyone drive our sync queue.
      console.error(
        "[webhook] GITHUB_WEBHOOK_SECRET is not set; rejecting delivery",
      );
    }
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");

  // Ping is GitHub's "is this endpoint alive?" probe when the webhook is first
  // saved. Answering 200 is what makes the green tick appear in the UI.
  if (event === "ping") return NextResponse.json({ ok: true });

  if (
    !event ||
    !HANDLED_EVENTS.includes(event as (typeof HANDLED_EVENTS)[number])
  ) {
    // Acknowledge anything else so GitHub doesn't retry or disable the hook.
    return new NextResponse(null, { status: 204 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const login = senderLogin(payload);
  if (!login) return new NextResponse(null, { status: 204 });

  // Do the DB work after responding: GitHub expects a fast acknowledgement and
  // marks slow endpoints as failing.
  after(async () => {
    try {
      const user = await db.user.findUnique({
        where: { githubUsername: login },
        select: { id: true },
      });
      // Unknown senders (outside contributors, bots) are ignored silently —
      // they have no leaderboard entry to refresh.
      if (user) await markGithubDirty(user.id);
    } catch (error) {
      console.error("[webhook] failed to flag member for refresh:", error);
    }
  });

  return new NextResponse(null, { status: 204 });
}
