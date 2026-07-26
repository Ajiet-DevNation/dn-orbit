// Pure policy for the stats drip queue: how stale is stale, how long to back
// off after a failure, and how much work one request may take on.
//
// Split out from lib/sync.ts so the rules can be unit-tested without a database.

/** How long a member's GitHub stats stay fresh. */
export const GH_TTL_MS = 30 * 60_000;
/** LeetCode is polled less often — no webhook exists, and it changes slower. */
export const LC_TTL_MS = 60 * 60_000;

/** Members refreshed per /api/sync call. */
export const DRAIN_BATCH = 5;
/**
 * Wall-clock budget for one drain, well inside the route's 60s maxDuration.
 * The old design tried to sync EVERY member in one request; a timeout there
 * wasted the entire run.
 */
export const DRAIN_BUDGET_MS = 25_000;
/** How long a claimed member stays locked, so a crashed drain self-heals. */
export const CLAIM_LOCK_MS = 2 * 60_000;

/** Backoff ceiling — roughly a day. */
export const MAX_BACKOFF_MS = 24 * 60 * 60_000;
const BASE_BACKOFF_MS = 5 * 60_000;

/**
 * When a member may next be attempted after `failCount` consecutive failures.
 *
 * Exponential with a ceiling. Previously a member with a revoked GitHub token
 * was retried on every single page visit, forever — a guaranteed 401 per
 * visitor.
 */
export function backoffMs(failCount: number): number {
  if (failCount <= 0) return 0;
  return Math.min(BASE_BACKOFF_MS * 2 ** (failCount - 1), MAX_BACKOFF_MS);
}

export function nextAttemptAt(failCount: number, now: number): Date {
  return new Date(now + backoffMs(failCount));
}

export interface StaleInput {
  ghFetchedAt: Date | null;
  lcFetchedAt: Date | null;
  ghDirty: boolean;
  lcDirty: boolean;
}

/** Does this member's GitHub data need refreshing? */
export function needsGithub(state: StaleInput, now: number): boolean {
  if (state.ghDirty) return true;
  return !state.ghFetchedAt || now - state.ghFetchedAt.getTime() > GH_TTL_MS;
}

/** Does this member's LeetCode data need refreshing? */
export function needsLeetCode(state: StaleInput, now: number): boolean {
  if (state.lcDirty) return true;
  return !state.lcFetchedAt || now - state.lcFetchedAt.getTime() > LC_TTL_MS;
}

export function needsAnything(state: StaleInput, now: number): boolean {
  return needsGithub(state, now) || needsLeetCode(state, now);
}

/**
 * Sort key for the queue: lower runs first.
 *
 * Dirty members (a real push just landed) jump ahead of everyone; after that
 * it's simply oldest-first, with never-fetched members treated as infinitely
 * stale so new joiners appear on the board quickly.
 */
export function queuePriority(state: StaleInput): number {
  if (state.ghDirty || state.lcDirty) return Number.NEGATIVE_INFINITY;
  const gh = state.ghFetchedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  const lc = state.lcFetchedAt?.getTime() ?? Number.NEGATIVE_INFINITY;
  return Math.min(gh, lc);
}

/** Order a set of candidates for draining. */
export function orderQueue<T extends StaleInput>(candidates: T[]): T[] {
  return [...candidates].sort((a, b) => queuePriority(a) - queuePriority(b));
}

/** Is there still time in this drain's budget to start another member? */
export function hasBudget(startedAt: number, now: number): boolean {
  return now - startedAt < DRAIN_BUDGET_MS;
}
