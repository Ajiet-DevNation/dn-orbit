-- CreateEnum
CREATE TYPE "EventAudience" AS ENUM ('members', 'college', 'public');

-- AlterTable: add new event columns
ALTER TABLE "events" ADD COLUMN     "audience" "EventAudience" NOT NULL DEFAULT 'public',
ADD COLUMN     "capacity" INTEGER,
ADD COLUMN     "form_schema" JSONB,
ADD COLUMN     "registration_deadline" TIMESTAMP(3);

-- AlterTable: add registrations columns as NULLABLE first (backfill-safe)
ALTER TABLE "registrations" ADD COLUMN "name" TEXT;
ALTER TABLE "registrations" ADD COLUMN "email" TEXT;
ALTER TABLE "registrations" ADD COLUMN "usn" TEXT;
ALTER TABLE "registrations" ADD COLUMN "responses" JSONB NOT NULL DEFAULT '{}';

-- Backfill name and email from the related user
UPDATE "registrations" r
SET "name" = u."name", "email" = u."email"
FROM "users" u
WHERE r."user_id" = u."id" AND r."name" IS NULL;

-- Enforce NOT NULL now that rows are backfilled
ALTER TABLE "registrations" ALTER COLUMN "name" SET NOT NULL;
ALTER TABLE "registrations" ALTER COLUMN "email" SET NOT NULL;

-- Make user_id nullable
ALTER TABLE "registrations" ALTER COLUMN "user_id" DROP NOT NULL;

-- Drop old unique index (userId, eventId) — created as a unique INDEX in init migration
DROP INDEX IF EXISTS "registrations_user_id_event_id_key";

-- Drop old FK (ON DELETE CASCADE) so we can re-add with SET NULL
ALTER TABLE "registrations" DROP CONSTRAINT IF EXISTS "registrations_user_id_fkey";

-- Re-add FK with ON DELETE SET NULL
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex: new unique (eventId, email)
CREATE UNIQUE INDEX "registrations_event_id_email_key" ON "registrations"("event_id", "email");
