/**
 * Scrapes DevNation's event history from AJIET's student-clubs page
 * (student-clubs.php → the "DEVNATION CLUB AJIET" tab, #pills-devnation) and
 * writes the most recent events into constants/clubEvents.json, already shaped
 * like the `Announcement` objects the landing-page carousel renders. The weekly
 * GitHub Action (.github/workflows/scrape-club-events.yml) runs this and opens
 * a PR when the output changes.
 *
 * Standalone and dependency-free (runs under Bun):
 *   bun run scripts/scrapeClubEvents.ts                 # fetch the live page
 *   bun run scripts/scrapeClubEvents.ts --html page.html  # parse a saved copy
 *
 * The --html mode exists because Cloudflare blocks GitHub's runner IPs from
 * fetching the page directly — every scheduled run of the old scrape workflow
 * failed. The Action fetches the HTML with browser TLS impersonation
 * (curl_cffi) and hands it to this script; local runs can just fetch.
 *
 * All parsing rules (headings as block delimiters, the three date spellings,
 * mapping to the announcement shape) live in lib/club-events.ts and are pinned
 * by lib/club-events.test.ts — this file is only the fetch → write shell.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseClubEvents, toClubAnnouncements } from "../lib/club-events";

const SOURCE = "https://www.ajiet.edu.in/student-clubs.php";
const MAX_ITEMS = 8;

// The site 403s non-browser user agents (including server-side fetchers), so we
// present a normal desktop Chrome UA on the direct-fetch path.
const HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const OUT_PATH = new URL("../constants/clubEvents.json", import.meta.url);

/** Returns the --html argument if given, throws if the flag has no value. */
function readHtmlArg(): string | null {
  const argv = process.argv.slice(2);
  const flag = argv.indexOf("--html");
  if (flag === -1) return null;
  const path = argv[flag + 1];
  if (!path) {
    throw new Error("--html requires a file path, e.g. --html page.html");
  }
  return path;
}

async function fetchPage(): Promise<string> {
  const res = await fetch(SOURCE, { headers: HEADERS });
  if (!res.ok) {
    throw new Error(`Failed to fetch ${SOURCE}: HTTP ${res.status}`);
  }
  return res.text();
}

async function main() {
  const htmlPath = readHtmlArg();
  const html = htmlPath ? readFileSync(htmlPath, "utf8") : await fetchPage();

  const events = parseClubEvents(html);
  const items = toClubAnnouncements(events, { max: MAX_ITEMS, href: SOURCE });

  // 2-space indent + trailing newline so the git diff is minimal and stable
  // when nothing actually changed.
  const outFile = fileURLToPath(OUT_PATH);
  writeFileSync(outFile, `${JSON.stringify(items, null, 2)}\n`);

  console.log(
    `Wrote ${items.length} club events to ${outFile} (parsed ${events.length} total)`,
  );
  for (const item of items) {
    console.log(`  ${item.meta ?? "undated"} | ${item.title}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
