-- Open-source contribution scoring.

-- Count of a member's merged PRs to public repos they don't own whose upstream
-- has at least ScoreWeight.gh_open_source_min_stars stars. Feeds the GitHub
-- component of the leaderboard score.
ALTER TABLE "github_stats"
  ADD COLUMN "open_source_prs" INTEGER NOT NULL DEFAULT 0;

-- Tunable knobs (admin Leaderboard panel), kept on the existing weights row so
-- there is a single source of scoring configuration. min_stars is applied at
-- fetch time; per_pr_points is applied at score time.
ALTER TABLE "score_weights"
  ADD COLUMN "gh_open_source_min_stars" INTEGER NOT NULL DEFAULT 10,
  ADD COLUMN "gh_open_source_per_pr_points" DOUBLE PRECISION NOT NULL DEFAULT 10;
