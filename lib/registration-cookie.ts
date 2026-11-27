// "This browser registered for this event." AJIET-only registrants have no
// account, so without this the site forgets them the moment they leave the
// success screen and offers REGISTER again. The register route sets one cookie
// per event holding the registration's id; pages look that id up to show the
// registrant (and their team) instead of the form.
//
// The value is the registration's random UUID, so it can't be guessed, and the
// cookie is httpOnly, so page scripts can't read it. It only ever reveals the
// holder's own registration. Shortcut: tied to one browser; a registrant on
// another device registers fresh (blocked as a duplicate email/USN) — an
// email-link lookup is the upgrade if that becomes a real complaint.

/** One cookie per event, e.g. "orbit_reg_2d5787a0-…". */
export function regCookieName(eventId: string): string {
  return `orbit_reg_${eventId}`;
}

/** Long enough to outlive any event's registration window. */
export const REG_COOKIE_MAX_AGE_S = 180 * 24 * 60 * 60;

/** Registration ids are UUIDs; anything else in the cookie is ignored. */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseRegCookie(value: string | undefined): string | null {
  return value && UUID_RE.test(value) ? value : null;
}

/**
 * Prisma filter for "this visitor's registration for this event": the one this
 * browser made (cookie) or the signed-in account's. Null when there is nothing
 * to identify the visitor by, so callers can skip the query.
 */
export function myRegistrationWhere(
  eventId: string,
  regId: string | null,
  userId: string | null | undefined,
): { eventId: string; OR: ({ id: string } | { userId: string })[] } | null {
  const or = [
    ...(regId ? [{ id: regId }] : []),
    ...(userId ? [{ userId }] : []),
  ];
  return or.length > 0 ? { eventId, OR: or } : null;
}
