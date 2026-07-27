-- Per-member refresh state for the stats drip queue.
--
-- Replaces the all-or-nothing global sync (one lock, every member in one
-- request) with per-member freshness so /api/sync can drain a few of the
-- stalest members per call instead of risking a timeout on the whole cohort.

CREATE TABLE "stats_sync_state" (
    "user_id" TEXT NOT NULL,
    "gh_fetched_at" TIMESTAMP(3),
    "lc_fetched_at" TIMESTAMP(3),
    "gh_dirty" BOOLEAN NOT NULL DEFAULT false,
    "lc_dirty" BOOLEAN NOT NULL DEFAULT false,
    "fail_count" INTEGER NOT NULL DEFAULT 0,
    "next_attempt_at" TIMESTAMP(3),
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stats_sync_state_pkey" PRIMARY KEY ("user_id")
);

-- The queue's ordering index: webhook-flagged members first, then stalest.
CREATE INDEX "stats_sync_state_gh_dirty_gh_fetched_at_idx"
    ON "stats_sync_state"("gh_dirty", "gh_fetched_at");

-- Used to skip members still inside their failure backoff.
CREATE INDEX "stats_sync_state_next_attempt_at_idx"
    ON "stats_sync_state"("next_attempt_at");

ALTER TABLE "stats_sync_state"
    ADD CONSTRAINT "stats_sync_state_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill a queue row for every existing member, seeded from whatever stats
-- they already have. Without this, nobody would be in the queue until they next
-- signed in, and the board would silently stop refreshing.
INSERT INTO "stats_sync_state" ("user_id", "gh_fetched_at", "lc_fetched_at", "updated_at")
SELECT
    u."id",
    (SELECT MAX(g."fetched_at") FROM "github_stats" g WHERE g."user_id" = u."id"),
    (SELECT MAX(l."fetched_at") FROM "lc_stats" l WHERE l."user_id" = u."id"),
    NOW()
FROM "users" u
ON CONFLICT ("user_id") DO NOTHING;
