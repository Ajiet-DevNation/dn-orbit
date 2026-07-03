-- CreateTable
CREATE TABLE "sync_runs" (
    "key" TEXT NOT NULL,
    "last_run_at" TIMESTAMP(3),
    "locked_until" TIMESTAMP(3),

    CONSTRAINT "sync_runs_pkey" PRIMARY KEY ("key")
);
