import { db } from "@/lib/db";
import { recomputeLeaderboardScores } from "@/lib/leaderboard";
import { invalidatePublic, PUBLIC_TAG } from "@/lib/public-tags";
import {
  syncGitHubStatsForUser,
  syncLeetCodeStatsForUser,
} from "@/lib/statsSync";
import {
  CLAIM_LOCK_MS,
  DRAIN_BATCH,
  hasBudget,
  needsGithub,
  needsLeetCode,
  nextAttemptAt,
  nextDueAt,
  orderQueue,
} from "@/lib/sync-queue";

// ─── Stats drip queue ────────────────────────────────────────────────────────
//
// Replaces the previous all-or-nothing design, which took one global lock and
// then refreshed EVERY member's GitHub and LeetCode stats inside a single
// request. That had three problems:
//
//   • One slow member stalled the whole batch, and a timeout wasted the entire
//     run — including the members that had already succeeded.
//   • Freshness was a single board-wide 15-minute window. A member who pushed
//     30 seconds ago waited exactly as long as one who had not touched code in
//     a month.
//   • A member with a revoked token 401'd on every visit, forever, with no
//     backoff.
//
// Now each call claims a few of the *stalest* members (webhook-flagged ones
// first), refreshes only those under a wall-clock budget, and stamps per-member
// freshness. Ordinary traffic converges the cohort within a few page views, and
// no single request can run long enough to time out.

/** Singleton row key recording when the board was last recomputed. */
const RUN_KEY = "stats";

export type SyncOutcome = "idle" | "drained" | "failed";

export interface DrainResult {
  outcome: SyncOutcome;
  /** Members actually refreshed this call. */
  refreshed: number;
  /** True when at least one member's stats changed, so the board was recomputed. */
  recomputed: boolean;
}

/**
 * Refresh a bounded slice of the queue.
 *
 * Safe to call concurrently: each member is claimed with an atomic conditional
 * update, so two simultaneous visitors take disjoint work rather than both
 * fetching the same person.
 */
export async function runStatsSyncIfStale(): Promise<DrainResult> {
  const startedAt = Date.now();
  const now = new Date(startedAt);

  // Open-source PR bar is admin-tunable; read once and reuse for the batch.
  const weightConfig = await db.scoreWeight.findFirst({
    select: { ghOpenSourceMinStars: true },
  });
  const openSourceMinStars = weightConfig?.ghOpenSourceMinStars ?? 10;

  // Candidates: everyone whose backoff has expired and who isn't already being
  // refreshed by another request. Over-fetch a little so that members filtered
  // out by the freshness check below don't starve the batch.
  const candidates = await db.statsSyncState.findMany({
    where: {
      AND: [
        { OR: [{ nextAttemptAt: null }, { nextAttemptAt: { lte: now } }] },
        { OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }] },
      ],
    },
    // Postgres sorts NULLs LAST on ASC, and never-fetched members have a null
    // ghFetchedAt — without `nulls: first` new joiners queued behind everyone.
    orderBy: [
      { ghDirty: "desc" },
      { lcDirty: "desc" },
      { ghFetchedAt: { sort: "asc", nulls: "first" } },
    ],
    take: DRAIN_BATCH * 4,
    select: {
      userId: true,
      ghFetchedAt: true,
      lcFetchedAt: true,
      ghDirty: true,
      lcDirty: true,
      failCount: true,
      user: {
        select: {
          lcUsername: true,
          accounts: {
            where: { provider: "github", access_token: { not: null } },
            select: { id: true },
          },
        },
      },
    },
  });

  const canGithub = (c: (typeof candidates)[number]) =>
    c.user.accounts.length > 0;
  const canLc = (c: (typeof candidates)[number]) => !!c.user.lcUsername;
  const isDue = (c: (typeof candidates)[number]) =>
    (needsGithub(c, startedAt) && canGithub(c)) ||
    (needsLeetCode(c, startedAt) && canLc(c));
  const due = orderQueue(candidates).filter(isDue);

  // Park everyone in the window who has nothing to do yet (fresh, or nothing
  // refreshable) until they next do, so they stop crowding out members that
  // are due. Dirty marks and profile edits clear nextAttemptAt again.
  const parked = candidates.filter((c) => !isDue(c));
  if (parked.length > 0) {
    await db.$transaction(
      parked.map((c) =>
        db.statsSyncState.updateMany({
          where: { userId: c.userId, ghDirty: false, lcDirty: false },
          data: {
            nextAttemptAt: nextDueAt(c, canGithub(c), canLc(c), startedAt),
          },
        }),
      ),
    );
  }

  if (due.length === 0)
    return { outcome: "idle", refreshed: 0, recomputed: false };

  let refreshed = 0;
  let changed = false;

  for (const candidate of due.slice(0, DRAIN_BATCH)) {
    if (!hasBudget(startedAt, Date.now())) break;

    // Atomic claim: only the request whose update actually matches a row with
    // an expired lock proceeds. `count === 0` means someone else got there.
    const claimed = await db.statsSyncState.updateMany({
      where: {
        userId: candidate.userId,
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: new Date() } }],
      },
      data: { lockedUntil: new Date(Date.now() + CLAIM_LOCK_MS) },
    });
    if (claimed.count === 0) continue;

    const wantGithub =
      needsGithub(candidate, startedAt) && candidate.user.accounts.length > 0;
    const wantLc =
      needsLeetCode(candidate, startedAt) && !!candidate.user.lcUsername;

    let ghOk = false;
    let lcOk = false;
    let anyFailed = false;

    if (wantGithub) {
      const result = await syncGitHubStatsForUser(
        candidate.userId,
        openSourceMinStars,
      );
      if (result.ok) ghOk = true;
      else anyFailed = true;
    }

    if (wantLc && hasBudget(startedAt, Date.now())) {
      const result = await syncLeetCodeStatsForUser(candidate.userId);
      if (result.ok) lcOk = true;
      else anyFailed = true;
    }

    const anyOk = ghOk || lcOk;
    const failCount = anyFailed ? candidate.failCount + 1 : 0;
    const stampedAt = new Date();
    // Each provider is stamped only on its OWN success: a failed GitHub fetch
    // must not be marked fresh because LeetCode happened to succeed.
    const after = {
      ghFetchedAt: ghOk ? stampedAt : candidate.ghFetchedAt,
      lcFetchedAt: lcOk ? stampedAt : candidate.lcFetchedAt,
      ghDirty: ghOk ? false : candidate.ghDirty,
      lcDirty: lcOk ? false : candidate.lcDirty,
    };

    await db.statsSyncState.update({
      where: { userId: candidate.userId },
      data: {
        ...(ghOk ? { ghFetchedAt: stampedAt, ghDirty: false } : {}),
        ...(lcOk ? { lcFetchedAt: stampedAt, lcDirty: false } : {}),
        failCount,
        nextAttemptAt: anyFailed
          ? nextAttemptAt(failCount, Date.now())
          : nextDueAt(
              after,
              canGithub(candidate),
              canLc(candidate),
              Date.now(),
            ),
        lockedUntil: null,
      },
    });

    if (anyOk) {
      refreshed += 1;
      changed = true;
    }
  }

  // Recompute only when something actually moved. The board used to be
  // delete-all + recreate on every run regardless.
  if (changed) {
    try {
      await recomputeLeaderboardScores();
      await db.syncRun.upsert({
        where: { key: RUN_KEY },
        create: { key: RUN_KEY, lastRunAt: new Date() },
        update: { lastRunAt: new Date() },
      });
      // The board's "last synced" readout.
      invalidatePublic(PUBLIC_TAG.leaderboard);
    } catch (error) {
      console.error("[sync] leaderboard recompute failed:", error);
      return { outcome: "failed", refreshed, recomputed: false };
    }
  }

  return { outcome: "drained", refreshed, recomputed: changed };
}

/** Flag a member for priority refresh — called by the GitHub webhook.
 *
 * Upserts rather than updates: this doubles as the backfill for a member whose
 * queue row is missing. New members get one at sign-up (see the adapter's
 * `createUser` in lib/auth.ts), so in practice that is only ever a member who
 * predates the queue. */
export async function markGithubDirty(userId: string): Promise<void> {
  await db.statsSyncState.upsert({
    where: { userId },
    create: { userId, ghDirty: true },
    // Clear any backoff: a real push is evidence the account is live, so a
    // previously-failing member shouldn't stay parked for hours.
    update: { ghDirty: true, nextAttemptAt: null, failCount: 0 },
  });
}

/** When the board was last recomputed, for the "SYNCED … AGO" readout. */
export async function lastSyncedAt(): Promise<Date | null> {
  const row = await db.syncRun.findUnique({ where: { key: RUN_KEY } });
  return row?.lastRunAt ?? null;
}
