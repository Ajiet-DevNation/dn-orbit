-- CreateTable
CREATE TABLE "allowlist" (
    "id" TEXT NOT NULL,
    "github_username" TEXT,
    "email" TEXT,
    "note" TEXT,
    "added_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "allowlist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "allowlist_github_username_key" ON "allowlist"("github_username");

-- CreateIndex
CREATE UNIQUE INDEX "allowlist_email_key" ON "allowlist"("email");
