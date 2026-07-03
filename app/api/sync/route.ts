import { NextResponse } from "next/server";
import { runStatsSyncIfStale } from "@/lib/sync";

// Unauthenticated by design: the DB staleness check + lock inside
// runStatsSyncIfStale make this self-rate-limiting (at most one real sync per
// stale window, one runner at a time), so an anonymous caller can't trigger
// more upstream work than an ordinary visitor. 60s is the Vercel Hobby
// ceiling — the full-cohort sync needs the headroom.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST() {
  const outcome = await runStatsSyncIfStale();
  return NextResponse.json(
    { outcome },
    { status: outcome === "failed" ? 500 : 200 },
  );
}
