import { db } from "@/lib/db";

// Append one entry to the system activity feed. Best-effort: a logging failure
// must never break the user action that triggered it, so all errors are
// swallowed (and surfaced to the server console). Fire-and-forget at call sites
// via `void logAudit(...)` when you don't want to await the write.
export async function logAudit(entry: {
  /** Machine tag, e.g. "event.create" / "member.role_change". */
  action: string;
  /** Human-readable line shown in the dashboard feed. */
  summary: string;
  /** Who performed it (display name); null for anonymous/public actors. */
  actorName?: string | null;
  /** Acting user's id, when known. */
  actorId?: string | null;
}): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        action: entry.action,
        summary: entry.summary,
        actorName: entry.actorName ?? null,
        actorId: entry.actorId ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log:", err);
  }
}
