-- Postgres does not index foreign keys on its own. These back the per-user
-- lookups (stats, accounts, registrations), the public event/project lists
-- and the leaderboard ordering. Additive only: no data is touched.
-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "github_stats_user_id_idx" ON "github_stats"("user_id");

-- CreateIndex
CREATE INDEX "lc_stats_user_id_idx" ON "lc_stats"("user_id");

-- CreateIndex
CREATE INDEX "events_created_by_idx" ON "events"("created_by");

-- CreateIndex
CREATE INDEX "events_review_status_is_published_event_date_idx" ON "events"("review_status", "is_published", "event_date");

-- CreateIndex
CREATE INDEX "registrations_user_id_idx" ON "registrations"("user_id");

-- CreateIndex
CREATE INDEX "feedback_event_id_idx" ON "feedback"("event_id");

-- CreateIndex
CREATE INDEX "leaderboard_scores_total_score_idx" ON "leaderboard_scores"("total_score");

-- CreateIndex
CREATE INDEX "projects_lead_id_idx" ON "projects"("lead_id");

-- CreateIndex
CREATE INDEX "projects_review_status_submitted_at_idx" ON "projects"("review_status", "submitted_at");

-- CreateIndex
CREATE INDEX "project_members_user_id_idx" ON "project_members"("user_id");

