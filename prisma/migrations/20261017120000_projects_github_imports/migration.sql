-- CreateEnum
CREATE TYPE "ProjectSource" AS ENUM ('manual', 'github');

-- DropForeignKey
ALTER TABLE "projects" DROP CONSTRAINT "projects_lead_id_fkey";

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "github_repo_full_name" TEXT,
ADD COLUMN     "source" "ProjectSource" NOT NULL DEFAULT 'manual',
ALTER COLUMN "lead_id" DROP NOT NULL,
ALTER COLUMN "progress_pct" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "projects_github_repo_full_name_key" ON "projects"("github_repo_full_name");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
