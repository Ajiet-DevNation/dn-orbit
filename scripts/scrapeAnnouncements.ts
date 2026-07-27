/**
 * Scrapes AJIET's "News & Events" feed (news-all.php) and writes the most recent
 * items into constants/campusAnnouncements.json, already shaped like the
 * `Announcement` objects the carousel renders. The weekly GitHub Action
 * (.github/workflows/scrape-announcements.yml) runs this and opens a PR when the
 * output changes, so new campus news shows up on ORBIT without a manual edit.
 *
 * Standalone script, deliberately dependency-free (runs under Bun or Node 18+):
 *   bun run scripts/scrapeAnnouncements.ts
 *
 * The source HTML is messy (each item embeds escaped Google-Sheets markup), so
 * we strip that noise first, then regex out each item's id, slug, title, date
 * and detail URL. Regex-on-HTML is normally a smell, but this is a single known
 * page refreshed weekly — not worth pulling in a parser dependency for.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const SOURCE = "https://www.ajiet.edu.in/news-all.php";
const BASE = "https://www.ajiet.edu.in/";
// The site 403s non-browser user agents (including server-side fetchers), so we
// present a normal desktop Chrome UA.
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const MAX_ITEMS = 8;

const OUT_PATH = new URL(
  "../constants/campusAnnouncements.json",
  import.meta.url,
);

// Mirrors the `Announcement` interface in AnnouncementCarousel.tsx (plus href).
// All fields are plain JSON-serialisable values so the file imports directly.
interface CampusAnnouncement {
  id: string;
  tag: "AJIET";
  title: string;
  body: string | null;
  meta: string;
  href: string;
}

const MONTHS = [
  "JAN",
  "FEB",
  "MAR",
  "APR",
  "MAY",
  "JUN",
  "JUL",
  "AUG",
  "SEP",
  "OCT",
  "NOV",
  "DEC",
];

/** "2026-04-13" → "APR 13, 2026 · AJIET" (carousel `meta` line). */
function formatMeta(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${String(d).padStart(2, "0")}, ${y} · AJIET`;
}

/** "aj-astrix-2026" → "Aj Astrix 2026" — fallback when no heading is found. */
function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function stripTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Trim to a card-sized teaser, cutting on a word boundary with an ellipsis. */
function snippet(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/**
 * Fetches an item's detail page and returns a short teaser from its first real
 * paragraph. The detail pages (unlike the list page) carry clean prose, so a
 * first-substantial-<p> heuristic is enough. Retries with back-off because the
 * host throttles bursts of requests; returns null on persistent failure so a
 * missing body never breaks the run — the card just renders without one.
 */
async function fetchBody(url: string, attempts = 3): Promise<string | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": UA } });
      if (res.ok) {
        const html = (await res.text()).replace(
          /<(script|style)[\s\S]*?<\/\1>/gi,
          " ",
        );
        for (const p of html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)) {
          const text = decodeEntities(stripTags(p[1]));
          if (text.length > 60) return snippet(text);
        }
        return null; // page loaded fine but has no usable paragraph
      }
    } catch {
      // network blip — fall through to the back-off and retry
    }
    await sleep(1500 * (i + 1));
  }
  return null;
}

async function main() {
  const res = await fetch(SOURCE, { headers: { "User-Agent": UA } });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE}: HTTP ${res.status}`);
  }
  const html = await res.text();

  // Drop the embedded Google-Sheets attribute blobs and <span> wrappers that
  // otherwise swallow the real headings.
  const clean = html
    .replace(/data-sheets-[a-z-]+="(?:[^"\\]|\\.)*"/g, " ")
    .replace(/<span[^>]*>/g, " ")
    .replace(/<\/span>/g, " ");

  const anchor = /news-details\.php\?url=(\d+)\/([a-z0-9-]+)/g;
  const seen = new Set<string>();
  const items: (CampusAnnouncement & { date: string })[] = [];

  for (let m = anchor.exec(clean); m !== null; m = anchor.exec(clean)) {
    const [match, id, slug] = m;
    if (seen.has(id)) continue;
    seen.add(id);

    // Title + date live in the markup immediately preceding the "View more"
    // anchor: a stack of headings ending with the title, then an <h3> date.
    const window = clean.slice(Math.max(0, m.index - 1400), m.index + 200);

    const headings = [...window.matchAll(/<h[1-5][^>]*>([\s\S]*?)<\/h[1-5]>/gi)]
      .map((h) => decodeEntities(stripTags(h[1])))
      .filter((t) => t && !/^20\d\d-\d\d-\d\d$/.test(t));
    const title = headings.at(-1) ?? titleFromSlug(slug);

    const dateMatch = window.match(/20\d\d-\d\d-\d\d/g);
    if (!dateMatch) continue; // no date → skip, can't place it on the strip
    const date = dateMatch.at(-1)!;

    items.push({
      id: `ajiet-${id}`,
      tag: "AJIET",
      title,
      body: null,
      meta: formatMeta(date),
      href: new URL(match, BASE).toString(),
      date,
    });
  }

  // Freshest first, capped — the campus feed is long and mostly historical.
  items.sort((a, b) => b.date.localeCompare(a.date));
  const selected = items.slice(0, MAX_ITEMS);

  if (selected.length === 0) {
    throw new Error(
      "Parsed 0 announcements — page structure may have changed.",
    );
  }

  // Fetch a teaser for each selected item from its detail page. Done after the
  // slice so we only hit the few pages we'll actually show, and sequentially to
  // stay gentle on the host.
  const top: CampusAnnouncement[] = [];
  for (const [i, item] of selected.entries()) {
    if (i > 0) await sleep(700); // space out requests so the host doesn't throttle
    top.push({
      id: item.id,
      tag: item.tag,
      title: item.title,
      body: await fetchBody(item.href),
      meta: item.meta,
      href: item.href,
    });
  }

  // 2-space indent + trailing newline so the git diff is minimal and stable
  // when nothing actually changed.
  const outFile = fileURLToPath(OUT_PATH);
  writeFileSync(outFile, `${JSON.stringify(top, null, 2)}\n`);
  console.log(`Wrote ${top.length} announcements to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
