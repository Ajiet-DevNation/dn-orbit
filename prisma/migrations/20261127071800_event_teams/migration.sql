-- AlterTable
ALTER TABLE "events" ADD COLUMN     "team_config" JSONB;

-- AlterTable
ALTER TABLE "registrations" ADD COLUMN     "team_id" TEXT;

-- CreateTable
CREATE TABLE "event_teams" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "match_value" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_teams_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "event_teams_event_id_code_key" ON "event_teams"("event_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "event_teams_event_id_name_key_key" ON "event_teams"("event_id", "name_key");

-- CreateIndex
CREATE INDEX "registrations_team_id_idx" ON "registrations"("team_id");

-- AddForeignKey
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "event_teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_teams" ADD CONSTRAINT "event_teams_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
