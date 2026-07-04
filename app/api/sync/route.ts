import { after, NextResponse } from "next/server";
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

export async function POST() {
  after(async () => {
    await runStatsSyncIfStale();
  });
  return NextResponse.json({ outcome: "accepted" }, { status: 202 });
}
