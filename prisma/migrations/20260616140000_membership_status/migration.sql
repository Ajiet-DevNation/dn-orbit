CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

ALTER TABLE "users"
  ADD COLUMN "status" "ApprovalStatus" NOT NULL DEFAULT 'pending';

-- Grandfather everyone already in: existing members stay approved.
UPDATE "users" SET "status" = 'approved';
