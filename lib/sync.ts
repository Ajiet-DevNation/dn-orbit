import { db } from "@/lib/db";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";
import { syncAllStats } from "@/lib/statsSync";

// How old the last full sync may be before a visit triggers a new one.
export const STALE_MS = (Number(process.env.SYNC_STALE_MINUTES) || 15) * 60_000;

// Lock TTL: generously above the 60s route budget so a crashed run can't wedge
// the sync forever, but short enough to self-heal within minutes.
const LOCK_MS = 5 * 60_000;
const KEY = "stats";

export function isStale(lastRunAt: Date | null, now: number): boolean {
  return !lastRunAt || now - lastRunAt.getTime() > STALE_MS;
}

export type SyncOutcome = "fresh" | "locked" | "synced" | "failed";

// Stale-while-revalidate replacement for the old GitHub Actions cron: pages
// always serve cached DB stats; a visit only *triggers* this (via POST
// /api/sync), never waits on it. The updateMany WHERE clause re-checks both
// staleness and the lock atomically, so concurrent visitors race on the DB
// row — exactly one of them runs the sync per stale window.
export async function runStatsSyncIfStale(): Promise<SyncOutcome> {
  const now = new Date();
  const row = await db.syncRun.upsert({
    where: { key: KEY },
    create: { key: KEY },
    update: {},
  });
  if (!isStale(row.lastRunAt, now.getTime())) return "fresh";

  const staleBefore = new Date(now.getTime() - STALE_MS);
  const acquired = await db.syncRun.updateMany({
    where: {
      key: KEY,
      OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      AND: [{ OR: [{ lastRunAt: null }, { lastRunAt: { lt: staleBefore } }] }],
    },
    data: { lockedUntil: new Date(now.getTime() + LOCK_MS) },
  });
  if (acquired.count === 0) return "locked";

  try {
    await syncAllStats();
    await recomputeLeaderboardScores();
    await db.syncRun.update({
      where: { key: KEY },
      data: { lastRunAt: new Date(), lockedUntil: null },
    });
    return "synced";
  } catch (error) {
    console.error("[sync] on-visit stats sync failed:", error);
    await db.syncRun.update({
      where: { key: KEY },
      data: { lockedUntil: null },
    });
    return "failed";
  }
}
