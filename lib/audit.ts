import { after } from "next/server";
import { db } from "@/lib/db";

/** Activity-feed rows older than this are pruned. */
const RETENTION_MS = 180 * 24 * 60 * 60_000;
/** Share of writes that also prune, so retention costs ~nothing per write. */
const PRUNE_CHANCE = 0.02;

type AuditEntry = {
  /** Machine tag, e.g. "event.create" / "member.role_change". */
  action: string;
  /** Human-readable line shown in the dashboard feed. */
  summary: string;
  /** Who performed it (display name); null for anonymous/public actors. */
  actorName?: string | null;
  /** Acting user's id, when known. */
  actorId?: string | null;
};

async function write(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        summary: entry.summary,
        actorName: entry.actorName ?? null,
        actorId: entry.actorId ?? null,
      },
    });
    // shortcut: probabilistic pruning, not a scheduled job; fine while the
    // feed grows by thousands of rows a year, revisit with a cron if it's more.
    if (Math.random() < PRUNE_CHANCE) {
      await db.auditLog.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - RETENTION_MS) } },
      });
    }
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}

// Append one entry to the system activity feed. Best-effort: a logging failure
// must never break the user action that triggered it, so all errors are
// swallowed (and surfaced to the server console). Call sites fire and forget
// with `void logAudit(...)`.
//
// Inside a request the write is handed to after(): on serverless, a promise
// still pending when the response is sent isn't guaranteed to finish, so
// fire-and-forget rows could silently go missing. Outside one (scripts),
// it just runs.
export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    after(() => write(entry));
  } catch {
    await write(entry);
  }
}
