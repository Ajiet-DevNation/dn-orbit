-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "allowlist_created_at_idx" ON "allowlist"("created_at");

-- CreateIndex
CREATE INDEX "events_reviewed_by_idx" ON "events"("reviewed_by");

-- CreateIndex
CREATE INDEX "projects_reviewed_by_idx" ON "projects"("reviewed_by");

-- CreateIndex
CREATE INDEX "recruitment_applications_status_created_at_idx" ON "recruitment_applications"("status", "created_at");

