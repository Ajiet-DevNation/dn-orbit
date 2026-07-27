// Server-side, live approval check against the DB (not the JWT, which can be
// stale after an admin approves). Used to gate member write-actions so approval
// takes effect immediately without the user re-authenticating.
import { db } from "@/lib/db";
import { canAccessAdmin } from "@/lib/roles";

export async function isApproved(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { status: true },
  });
  return u?.status === "approved";
}

/**
 * Outcome of an event-roster authorization check. Carries the HTTP status a
 * route should return so every roster endpoint answers identically instead of
 * each re-deriving 401/403/404 from scratch.
 */
export type EventAccess =
  | { ok: true; isAdmin: boolean }
  | { ok: false; status: 401 | 403 | 404 };

/**
 * May this session read/manage the registration roster for `eventId`?
 *
 * Two principals qualify, and only these two:
 *   - an admin tier (president / VP / core member) — any event;
 *   - the member who created the event — their own event only.
 *
 * Roster rows carry registrant PII (name, email, USN, and free-text answers to
 * the organizer's custom questions), so this is the single gate in front of
 * every surface that exposes them: the attendance mutation, the CSV export, and
 * the organizer roster page.
 *
 * `404` is returned for a missing event *before* the ownership test, which is
 * safe here because event IDs are not secret — approved events are listed
 * publicly — so distinguishing "gone" from "not yours" leaks nothing.
 */
export async function canManageEventRoster(
  eventId: string,
  user: { id?: string | null; role?: string | null } | null | undefined,
): Promise<EventAccess> {
  if (!user?.id) return { ok: false, status: 401 };

  const isAdmin = canAccessAdmin(user.role);

  const event = await db.event.findUnique({
    where: { id: eventId },
    select: { createdBy: true },
  });
  if (!event) return { ok: false, status: 404 };

  if (isAdmin || event.createdBy === user.id) return { ok: true, isAdmin };
  return { ok: false, status: 403 };
}
