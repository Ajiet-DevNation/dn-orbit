-- System activity feed: append-only audit log of every meaningful mutation.
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT,
    "actor_name" TEXT,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Pull the newest N cheaply even at high volume.
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");
