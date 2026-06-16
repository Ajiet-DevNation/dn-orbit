-- Content moderation: add a pending/approved/rejected review_status to projects
-- and events, plus reviewer metadata. Data-preserving: existing visible content
-- is backfilled to 'approved' BEFORE the old projects.is_approved flag is dropped.

-- 1. Add the new columns (default 'pending' so brand-new rows enter the queue).
ALTER TABLE "events"
  ADD COLUMN "review_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewed_at"   TIMESTAMP(3),
  ADD COLUMN "reviewed_by"   TEXT;

ALTER TABLE "projects"
  ADD COLUMN "review_status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
  ADD COLUMN "reviewed_at"   TIMESTAMP(3),
  ADD COLUMN "reviewed_by"   TEXT;

-- 2. Backfill so nothing already-public disappears.
--    Projects: carry over the old boolean (true -> approved, false -> pending).
UPDATE "projects" SET "review_status" = 'approved' WHERE "is_approved" = true;

--    Events: every pre-existing event was created before moderation existed,
--    so treat them all as approved (publish state still governs visibility).
UPDATE "events" SET "review_status" = 'approved';

-- 3. Drop the now-redundant projects flag (after the backfill above).
ALTER TABLE "projects" DROP COLUMN "is_approved";

-- 4. Reviewer foreign keys (nullable; clear the ref if the reviewer is deleted).
ALTER TABLE "events"   ADD CONSTRAINT "events_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "projects" ADD CONSTRAINT "projects_reviewed_by_fkey"
  FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
