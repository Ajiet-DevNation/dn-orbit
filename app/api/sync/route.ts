import { after, type NextRequest, NextResponse } from "next/server";
import { rateLimit, rateLimitKey, tooManyRequests } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/request";
import { runStatsSyncIfStale } from "@/lib/sync";

// Unauthenticated by design: the DB staleness check + lock inside
// runStatsSyncIfStale make this self-rate-limiting (at most one real sync per
// stale window, one runner at a time), so an anonymous caller can't trigger
// more upstream work than an ordinary visitor.
//
// The sync itself runs in after(), i.e. AFTER the response is sent — a full
// cohort sync takes tens of seconds, and holding the visitor's fetch open for
// that long left the browser stuck on "Transferring data from localhost".
// 60s is the Vercel Hobby ceiling; after() work counts toward it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Still unauthenticated (the lock is the real throttle), but require the call
  // to come from our own pages so an arbitrary site can't drive it from its
  // visitors' browsers. A direct curl has no Origin/Referer and is allowed —
  // that's fine, it hits the same DB lock as everyone else.
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Cheap backstop in front of the DB round-trip the lock check costs.
  const limit = rateLimit(rateLimitKey(req, "sync"), 6, 60_000);
  if (!limit.ok) return tooManyRequests(limit);

  after(async () => {
    await runStatsSyncIfStale();
  });
  return NextResponse.json({ outcome: "accepted" }, { status: 202 });
}
