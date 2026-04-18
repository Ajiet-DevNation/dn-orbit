import { db } from "./db";
import { auth } from "./auth";

export type AuditType = 'MEMBERS' | 'PROJECTS' | 'EVENTS' | 'LEADERBOARD' | 'INFRA';

/**
 * Log an administrative action to the Audit Registry.
 * This ensures 100% accountability for all HQ decisions.
 */
export async function logAction(
  type: AuditType,
  action: string,
  targetId?: string,
  metadata: Record<string, unknown> = {}
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return;

    await db.auditLog.create({
      data: {
        userId: session.user.id,
        type,
        action,
        targetId,
        metadata: JSON.parse(JSON.stringify(metadata)), // Ensure serialization safety
      },
    });
  } catch (error) {
    console.error("[AUDIT_FAILURE]:", error);
  }
}
