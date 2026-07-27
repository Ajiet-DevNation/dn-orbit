// Shared display formatters for event dates. Previously each surface (home
// grid, registration page, "your events") carried its own copy of
// `formatEventDateLong`, so a change to one silently diverged from the others.
//
// ── Why every formatter pins `timeZone: "UTC"` ───────────────────────────────
// The "new event" modal collects a `datetime-local` value — a wall-clock time
// with no zone ("2026-07-15T18:30"). `z.coerce.date()` turns that into a Date
// using the *server's* zone, which is UTC on Vercel and the developer's local
// zone in `bun dev`. Formatting without an explicit zone repeats that mistake on
// the way out, so the same row renders as two different times depending on where
// it is read.
//
// Pinning both ends to UTC makes the round-trip lossless and environment-
// independent: the organizer's typed wall-clock time is what every visitor sees.
// UTC (rather than Asia/Kolkata) is the carrier specifically because that is
// what production already does — switching carriers now would shift the
// displayed time of every event already in the database.

const ZONE = "UTC";

/** "JUL 15, 2026" — the long form used on cards and page headers. */
export function formatEventDateLong(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
      timeZone: ZONE,
    })
    .toUpperCase();
}

/** "JUL 15" — the compact form used in the announcement strip. */
export function formatEventDateShort(date: Date): string {
  return date
    .toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      timeZone: ZONE,
    })
    .toUpperCase();
}

/** "6:30 PM" — the time half of the organizer's datetime. */
export function formatEventTime(date: Date): string {
  return date
    .toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: ZONE,
    })
    .toUpperCase();
}

/** "JUL 14, 2026 · 11:59 PM" — deadlines need both halves to be unambiguous. */
export function formatEventDateTime(date: Date): string {
  return `${formatEventDateLong(date)} · ${formatEventTime(date)}`;
}
