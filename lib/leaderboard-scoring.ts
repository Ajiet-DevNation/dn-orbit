// Pure leaderboard scoring — no DB, no I/O, so it can be unit-tested in
// isolation. `recomputeLeaderboardScores` in lib/leaderboard.ts gathers the rows
// from Prisma and feeds them here; this module owns the maths and ranking.

export interface ScoringWeights {
  lcWeight: number;
  githubWeight: number;
  eventWeight: number;
  /**
   * Points awarded per qualifying open-source PR, folded into the raw GitHub
   * score. Tunable in the admin Leaderboard panel; defaults to 0 so callers that
   * don't supply it (e.g. older tests) keep the original GitHub formula.
   */
  githubOpenSourcePerPrPoints?: number;
}

export interface ScoringUserInput {
  userId: string;
  /** Latest LeetCode stats, or null if the user has none yet. */
  lc: { easySolved: number; mediumSolved: number; hardSolved: number } | null;
  /** Latest GitHub stats, or null if the user has none yet. */
  gh: {
    totalCommits: number;
    totalPrs: number;
    totalStars: number;
    /** Merged PRs to qualifying external repos. Optional; treated as 0. */
    openSourcePrs?: number;
  } | null;
  /** Count of events the user attended, measured against `totalEvents`. */
  attendedCount: number;
}

export interface ScoredUser {
  userId: string;
  lcScore: number;
  githubScore: number;
  eventScore: number;
  totalScore: number;
  rank: number;
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

// Raw, un-normalised component scores. LeetCode and GitHub are relative (each is
// later divided by the cohort maximum), so only their *shape* matters here.
export function rawLcScore(
  lc: ScoringUserInput["lc"]
): number {
  if (!lc) return 0;
  return lc.easySolved * 1 + lc.mediumSolved * 3 + lc.hardSolved * 5;
}

export function rawGithubScore(
  gh: ScoringUserInput["gh"],
  openSourcePerPrPoints = 0
): number {
  if (!gh) return 0;
  const openSource = (gh.openSourcePrs ?? 0) * openSourcePerPrPoints;
  return gh.totalCommits + gh.totalPrs * 2 + gh.totalStars + openSource;
}

/**
 * Score and rank a cohort of users.
 *
 * - LeetCode and GitHub raw scores are normalised to 0–100 against the cohort
 *   maximum (so the strongest user in each axis scores 100). A floor of 1 on the
 *   denominator avoids division by zero when nobody has any activity.
 * - Event score is an absolute attendance ratio, clamped to 0–100 so stray data
 *   (e.g. an attendance marked before the event count caught up) can't overflow.
 * - Ties break deterministically on userId, so repeated runs (and tests) produce
 *   a stable ordering.
 */
export function computeLeaderboard(
  users: ScoringUserInput[],
  weights: ScoringWeights,
  totalEvents: number
): ScoredUser[] {
  const raw = users.map((u) => ({
    userId: u.userId,
    rawLc: rawLcScore(u.lc),
    rawGh: rawGithubScore(u.gh, weights.githubOpenSourcePerPrPoints ?? 0),
    eventScore:
      totalEvents > 0 ? clamp((u.attendedCount / totalEvents) * 100, 0, 100) : 0,
  }));

  // LeetCode and GitHub raw values are unbounded activity counts with
  // heavy-tailed distributions: a single prolific member (thousands of commits
  // and merged PRs) would linearly crush everyone else's relative score into
  // single digits — e.g. 600 raw next to 7500 raw normalises to 8/100. Square-
  // root compression keeps the cohort leader at 100 while giving the rest a fair
  // spread (a member with a quarter of the leader's raw activity scores ~50, not
  // ~25), so the board reflects real standing instead of one outlier's dominance.
  const compress = (n: number) => Math.sqrt(Math.max(0, n));

  const maxLc = Math.max(1, ...raw.map((u) => compress(u.rawLc)));
  const maxGh = Math.max(1, ...raw.map((u) => compress(u.rawGh)));

  const scored = raw.map((u) => {
    const lcScore = (compress(u.rawLc) / maxLc) * 100;
    const githubScore = (compress(u.rawGh) / maxGh) * 100;
    const totalScore =
      lcScore * weights.lcWeight +
      githubScore * weights.githubWeight +
      u.eventScore * weights.eventWeight;
    return {
      userId: u.userId,
      lcScore,
      githubScore,
      eventScore: u.eventScore,
      totalScore,
    };
  });

  scored.sort(
    (a, b) =>
      b.totalScore - a.totalScore || a.userId.localeCompare(b.userId)
  );

  return scored.map((s, i) => ({ ...s, rank: i + 1 }));
}
