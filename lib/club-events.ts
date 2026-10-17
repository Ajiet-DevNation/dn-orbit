// Parsing + mapping for DevNation's event history as documented on AJIET's
// student-clubs page (student-clubs.php → the "DEVNATION CLUB AJIET" tab,
// element id `pills-devnation`).
//
// The pane is hand-maintained CMS HTML, so the parser leans on the two things
// that are actually consistent:
//
//   - every event is introduced by an <h3> heading, and each subsequent
//     "Programs" <h3> is only the label above that event's poster gallery —
//     not an event of its own
//   - each event's description is the first <p> that follows its heading
//
// Everything here is pure (string in, data out) so the scraper script stays a
// thin fetch → parse → write shell and these rules are pinned by unit tests.

import { formatEventDateLong } from "./event-format";

export interface ClubEvent {
  title: string;
  body: string | null;
  /** Event date in UTC; null when the block has no parseable date. */
  date: Date | null;
}

/**
 * JSON shape written to constants/clubEvents.json — must stay structurally
 * compatible with `Announcement` in components/home/AnnouncementCarousel.tsx.
 * The component assigns the imported JSON to `Announcement[]`, so any drift
 * here surfaces as a type error at build time.
 */
export interface ClubAnnouncement {
  id: string;
  tag: string;
  title: string;
  body: string | null;
  meta: string | null;
  href: string;
}

const PANE_MARKER = 'id="pills-devnation"';
const NEXT_PANE_MARKER = 'id="pills-';
const H3 = /<h3>([\s\S]*?)<\/h3>/gi;
const TAG = /<[^>]*>/g;
const WHITESPACE = /\s+/g;
const DATE_DMY = /(\d{1,2})-(\d{1,2})-(\d{4})/;
const DATE_D_MONTH_Y = /(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+),?\s+(\d{4})/;
const DATE_MONTH_D_Y = /([A-Za-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/;

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  quot: '"',
  apos: "'",
  lt: "<",
  gt: ">",
  nbsp: " ",
};

function stripTags(text: string): string {
  return text.replace(TAG, " ").replace(WHITESPACE, " ").trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, digits: string) => fromCodePoint(Number(digits)))
    .replace(/&#x([0-9a-f]+);/gi, (_, digits: string) =>
      fromCodePoint(Number.parseInt(digits, 16)),
    )
    .replace(
      /&([a-z]+);/gi,
      (match, name: string) => NAMED_ENTITIES[name.toLowerCase()] ?? match,
    );
}

function fromCodePoint(code: number): string {
  return Number.isInteger(code) && code >= 0 && code <= 0x10ffff
    ? String.fromCodePoint(code)
    : "";
}

/** Rejects rolled-over dates like Feb 30 (JS would silently make it Mar 2). */
function utcDate(year: number, month: number, day: number): Date | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month, day));
  if (date.getUTCMonth() !== month || date.getUTCDate() !== day) return null;
  return date;
}

function monthIndex(name: string): number {
  return MONTHS.indexOf(name.toLowerCase());
}

/**
 * Dates on this page appear as "27-11-2025" (day-first, Indian convention —
 * 03-01-2023 is Jan 3, not Mar 1), "April 15, 2026" and "13th October 2022".
 * Returns the first parseable date in the text, or null.
 */
export function parseEventDate(text: string): Date | null {
  const dmy = text.match(DATE_DMY);
  if (dmy) {
    const date = utcDate(Number(dmy[3]), Number(dmy[2]) - 1, Number(dmy[1]));
    if (date) return date;
  }

  const dayFirst = text.match(DATE_D_MONTH_Y);
  if (dayFirst) {
    const month = monthIndex(dayFirst[2]);
    if (month !== -1) {
      const date = utcDate(Number(dayFirst[3]), month, Number(dayFirst[1]));
      if (date) return date;
    }
  }

  const monthFirst = text.match(DATE_MONTH_D_Y);
  if (monthFirst) {
    const month = monthIndex(monthFirst[1]);
    if (month !== -1) {
      const date = utcDate(Number(monthFirst[3]), month, Number(monthFirst[2]));
      if (date) return date;
    }
  }

  return null;
}

/**
 * Slices the DevNation tab's pane out of the full page. The pane ends where
 * the *next* tab pane starts (the page renders every club's tab in order).
 */
export function extractDevNationPane(html: string): string {
  const start = html.indexOf(PANE_MARKER);
  if (start === -1) {
    throw new Error(
      "DevNation pane (id=pills-devnation) not found — student-clubs page structure may have changed.",
    );
  }
  const end = html.indexOf(NEXT_PANE_MARKER, start + PANE_MARKER.length);
  return end === -1 ? html.slice(start) : html.slice(start, end);
}

export function parseClubEvents(html: string): ClubEvent[] {
  const pane = extractDevNationPane(html);
  const headings = [...pane.matchAll(H3)];
  const events: ClubEvent[] = [];

  for (let i = 0; i < headings.length; i++) {
    const heading = headings[i];
    const title = decodeEntities(stripTags(heading[1]));
    // "Programs" heads the poster gallery that follows each event's text.
    if (!title || title.toLowerCase() === "programs") continue;

    const blockEnd = headings[i + 1]?.index ?? pane.length;
    const block = pane.slice(
      (heading.index ?? 0) + heading[0].length,
      blockEnd,
    );
    const paragraph = block.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const body = paragraph ? decodeEntities(stripTags(paragraph[1])) : "";
    const description = body.length > 0 ? body : null;

    events.push({
      title,
      body: description,
      date: parseEventDate(description ?? "") ?? parseEventDate(title),
    });
  }

  if (events.length === 0) {
    throw new Error(
      "DevNation pane parsed to 0 events — the page markup may have changed.",
    );
  }
  return events;
}

/** Trims body copy to a card-sized teaser, cutting on a word boundary. */
export function snippet(text: string, max = 160): string {
  const clean = text.replace(WHITESPACE, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function clubEventId(event: ClubEvent): string {
  const date = event.date ? event.date.toISOString().slice(0, 10) : "undated";
  return `devnation-${slugify(event.title)}-${date}`;
}

export interface ToClubAnnouncementsOptions {
  /** Newest N events to keep. */
  max?: number;
  /** Where a card's link should point (the source page). */
  href: string;
}

/**
 * Newest-first, capped at `max`, mapped to the carousel's announcement shape.
 * Undated events sort after dated ones (and keep their page order within a
 * tie) so the output is deterministic — that keeps weekly scrape diffs empty
 * unless the page itself changed.
 */
export function toClubAnnouncements(
  events: ClubEvent[],
  { max = 8, href }: ToClubAnnouncementsOptions,
): ClubAnnouncement[] {
  const sorted = [...events].sort((a, b) => {
    if (a.date && b.date) return b.date.getTime() - a.date.getTime();
    if (a.date) return -1;
    if (b.date) return 1;
    return 0;
  });

  return sorted.slice(0, max).map((event) => ({
    id: clubEventId(event),
    tag: "DEVNATION",
    title: event.title,
    body: event.body ? snippet(event.body) : null,
    meta: event.date ? `${formatEventDateLong(event.date)} · DEVNATION` : null,
    href,
  }));
}

/**
 * Lowercase, drop everything non-alphanumeric: "M.E.R.N" and "MERN" meet.
 * Deliberately exact-match only — partial matches would wrongly drop a club
 * card that merely shares a prefix with an event ("HackElite" vs "HackElite
 * 2024"), so the dedupe below stays conservative.
 */
export function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Filters out items whose title (normalized) matches one of `taken`, so a
 * scraped club event never repeats an event already shown from the database.
 */
export function dropDuplicateTitles<T extends { title: string }>(
  items: T[],
  taken: string[],
): T[] {
  const seen = new Set(taken.map(normalizeTitle));
  return items.filter((item) => !seen.has(normalizeTitle(item.title)));
}
