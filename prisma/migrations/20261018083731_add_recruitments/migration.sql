-- CreateTable
CREATE TABLE "recruitment_config" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "is_open" BOOLEAN NOT NULL DEFAULT false,
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recruitment_applications" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "usn" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "whatsapp" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "github_username" TEXT NOT NULL,
    "lc_username" TEXT NOT NULL,
    "linkedin_url" TEXT,
    "x_handle" TEXT,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" TEXT,
    "reviewed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recruitment_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recruitment_applications_created_at_idx" ON "recruitment_applications"("created_at");
