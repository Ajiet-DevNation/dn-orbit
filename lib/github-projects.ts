// Fetches the DevNation GitHub org's public repos and maps the showcase-worthy
// ones into drafts the admin sync route upserts into the `projects` table as
// PENDING rows. Approval happens in the normal moderation queue; only approved
// rows reach the public carousel.
//
// The mapping logic lives here (not in the route) so it can be unit-tested and
// so the org/thresholds are declared in exactly one place. Uses the GitHub REST
// API rather than scraping HTML — it returns clean JSON and exposes languages +
// topics we map into a tech stack. Set GITHUB_TOKEN to raise the unauthenticated
// rate limit (a sync costs 1 + one-per-repo requests, so ~9).

export const GITHUB_ORG = "Ajiet-DevNation";
const API = "https://api.github.com";
const MAX_PROJECTS = 8;
const MIN_DESC = 25; // drop workshop/template/placeholder repos with no real blurb
const DESC_MAX = 200; // teaser length for the detail panel

// A repo counts as still ACTIVE if it was pushed within this window, else it's
// treated as SHIPPED (a completed/past project). Months → ms.
const ACTIVE_WINDOW_MS = 8 * 30 * 24 * 60 * 60 * 1000;

/** The subset of the GitHub repo payload this module consumes. */
export interface Repo {
  name: string;
  /** "owner/name" — the stable key the DB upsert matches on. */
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  pushed_at: string;
  archived: boolean;
  topics?: string[];
  languages_url: string;
}

/** Content fields a sync can derive from a repo. The route adds the DB-only
 *  defaults (source, progressPct, reviewStatus). */
export interface GithubProjectDraft {
  githubRepoFullName: string;
  githubRepoUrl: string;
  title: string;
  description: string;
  techStack: string[];
  status: "active" | "completed"; // prisma ProjectStatus subset
}

// GitHub topic slugs → display names for the tech-stack chips. Anything not
// listed falls back to the repo's detected languages.
const TOPIC_LABELS: Record<string, string> = {
  nextjs: "Next.js",
  react: "React",
  typescript: "TypeScript",
  javascript: "JavaScript",
  tailwindcss: "Tailwind",
  prisma: "Prisma",
  "next-auth": "Auth.js",
  authjs: "Auth.js",
  razorpay: "Razorpay",
  bun: "Bun",
  laravel: "Laravel",
  laravel11: "Laravel",
  "laravel-framework": "Laravel",
  filament: "Filament",
};

// Build-tool entries the languages API reports that don't belong in a tech stack.
const STACK_IGNORE = new Set([
  "makefile",
  "cmake",
  "dockerfile",
  "batchfile",
  "shell",
  "roff",
]);

async function getJson<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "dn-orbit-project-sync",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  // `no-store`: a sync must always hit GitHub — a cached repo list would make
  // "sync" a no-op within the fetch cache window.
  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

/**
 * "DevNation-CMS" → "DEVNATION CMS"; "project_stack" → "PROJECT STACK";
 * "Aakar2025" → "AAKAR 2025" (split a letter/digit boundary so years read).
 */
export function titleFromName(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .trim()
    .toUpperCase();
}

export function snippet(text: string, max = DESC_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd()}…`;
}

/**
 * The showcase filter, as a pure function so the thresholds are testable:
 * non-archived repos with a real description, freshest push first, capped.
 */
export function selectShowcaseRepos(repos: Repo[]): Repo[] {
  return repos
    .filter(
      (r) => !r.archived && (r.description?.trim().length ?? 0) >= MIN_DESC,
    )
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, MAX_PROJECTS);
}

/** Top languages by bytes, plus any framework topics, deduped and capped. */
export async function buildTechStack(
  repo: Repo,
  getJsonFn: <T>(url: string) => Promise<T> = getJson,
): Promise<string[]> {
  const stack: string[] = [];
  const seen = new Set<string>();
  const add = (label: string) => {
    const key = label.toLowerCase();
    if (label && !seen.has(key)) {
      seen.add(key);
      stack.push(label);
    }
  };

  // Framework topics first — they read better than raw languages (e.g. "Next.js"
  // over "TypeScript"). Unknown topics are skipped.
  for (const topic of repo.topics ?? []) {
    const label = TOPIC_LABELS[topic];
    if (label) add(label);
  }

  try {
    const langs = await getJsonFn<Record<string, number>>(repo.languages_url);
    for (const lang of Object.entries(langs)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)) {
      if (!STACK_IGNORE.has(lang.toLowerCase())) add(lang);
    }
  } catch {
    if (repo.language) add(repo.language);
  }

  return stack.slice(0, 5);
}

/** Map a repo + its built stack into row content. Pure — no fetching. */
export function toProjectDraft(
  repo: Repo,
  techStack: string[],
  now: number,
): GithubProjectDraft {
  const active = now - Date.parse(repo.pushed_at) < ACTIVE_WINDOW_MS;
  return {
    githubRepoFullName: repo.full_name,
    githubRepoUrl: repo.html_url,
    title: titleFromName(repo.name),
    description: snippet(repo.description ?? ""),
    techStack,
    status: active ? "active" : "completed",
  };
}

/** Full pipeline: org repos → showcase selection → drafts. */
export async function fetchGithubProjectDrafts(): Promise<
  GithubProjectDraft[]
> {
  const repos = await getJson<Repo[]>(
    `${API}/orgs/${GITHUB_ORG}/repos?per_page=100&sort=pushed&type=public`,
  );
  const now = Date.now();
  const selected = selectShowcaseRepos(repos);

  const drafts: GithubProjectDraft[] = [];
  for (const repo of selected) {
    drafts.push(toProjectDraft(repo, await buildTechStack(repo), now));
  }
  return drafts;
}
