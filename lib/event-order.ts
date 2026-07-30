// Display ordering for the public event surfaces.
//
// The home page reads events with `orderBy: { eventDate: "asc" }`, which is the
// right *query* order but the wrong *display* order once the club has a history:
// ascending by date puts the oldest event first, so the ANNOUNCEMENTS strip
// (which takes the first six) would announce a workshop from February and the
// events grid's first page would open on events that have already happened.
//
// Both surfaces want the same thing: what is coming up, soonest first — and only
// then what has already been, most recent first. That is a pure partition over
// the rows the page already fetched, so it costs no extra query.

export interface HasEventDate {
  eventDate: Date;
}

/**
 * Upcoming events (soonest first), followed by past events (most recent first).
 *
 * An event exactly at `now` counts as upcoming: a session that starts this
 * minute is still the thing a visitor most needs to see.
 */
export function orderForDisplay<T extends HasEventDate>(
  events: T[],
  now: Date = new Date(),
): T[] {
  const cutoff = now.getTime();
  const upcoming: T[] = [];
  const past: T[] = [];

  for (const e of events) {
    (e.eventDate.getTime() >= cutoff ? upcoming : past).push(e);
  }

  upcoming.sort((a, b) => a.eventDate.getTime() - b.eventDate.getTime());
  past.sort((a, b) => b.eventDate.getTime() - a.eventDate.getTime());

  return [...upcoming, ...past];
}
