/**
 * Pulls DevNation's GitHub org repositories and writes the showcase-worthy ones
 * into constants/githubProjects.json, shaped like the `ProjectData` the Projects
 * section renders. Run on demand:
 *   bun run scrape:projects
 *
 * Standalone, dependency-free (Bun or Node 18+). Uses the GitHub REST API rather
 * than scraping HTML — it returns clean JSON and exposes languages + topics we
 * map into a tech stack. Set GITHUB_TOKEN to raise the unauthenticated rate
 * limit if you hit it.
 */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const ORG = "Ajiet-DevNation";
const API = "https://api.github.com";
const MAX_PROJECTS = 8;
const MIN_DESC = 25; // drop workshop/template/placeholder repos with no real blurb
const DESC_MAX = 200; // teaser length for the detail panel

// A repo counts as still ACTIVE if it was pushed within this window, else it's
// treated as SHIPPED (a completed/past project). Months → ms.
const ACTIVE_WINDOW_MS = 8 * 30 * 24 * 60 * 60 * 1000;

const OUT_PATH = new URL("../constants/githubProjects.json", import.meta.url);

// Mirrors ProjectData in constants/projects.ts.
interface ProjectData {
  id: string;
  title: string;
  imageUrl: string | null;
  description: string;
  techStack: string[];
  githubUrl: string | null;
  status: string;
}

interface Repo {
  name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  pushed_at: string;
  fork: boolean;
  archived: boolean;
  topics?: string[];
  languages_url: string;
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

const headers: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "dn-orbit-project-scraper",
  "X-GitHub-Api-Version": "2022-11-28",
};
if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${url}`);
  }
  return (await res.json()) as T;
}

// Build-tool entries the languages API reports that don't belong in a tech stack.
const STACK_IGNORE = new Set([
  "makefile",
  "cmake",
  "dockerfile",
  "batchfile",
  "shell",
  "roff",
]);

/**
 * "DevNation-CMS" → "DEVNATION CMS"; "project_stack" → "PROJECT STACK";
 * "Aakar2025" → "AAKAR 2025" (split a letter/digit boundary so years read).
 */
function titleFromName(name: string): string {
  return name
    .replace(/[-_]+/g, " ")
    .replace(/([A-Za-z])(\d)/g, "$1 $2")
    .trim()
    .toUpperCase();
}

function snippet(text: string, max = DESC_MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return cut.slice(0, lastSpace > 0 ? lastSpace : max).trimEnd() + "…";
}

/** Top languages by bytes, plus any framework topics, deduped and capped. */
async function buildTechStack(repo: Repo): Promise<string[]> {
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
    const langs = await getJson<Record<string, number>>(repo.languages_url);
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

async function main() {
  const repos = await getJson<Repo[]>(
    `${API}/orgs/${ORG}/repos?per_page=100&sort=pushed&type=public`
  );

  const now = Date.now();
  const selected = repos
    .filter((r) => !r.archived && (r.description?.trim().length ?? 0) >= MIN_DESC)
    .sort((a, b) => Date.parse(b.pushed_at) - Date.parse(a.pushed_at))
    .slice(0, MAX_PROJECTS);

  const projects: ProjectData[] = [];
  for (const repo of selected) {
    const active = now - Date.parse(repo.pushed_at) < ACTIVE_WINDOW_MS;
    projects.push({
      id: repo.name.toLowerCase(),
      title: titleFromName(repo.name),
      imageUrl: null,
      description: snippet(repo.description ?? ""),
      techStack: await buildTechStack(repo),
      githubUrl: repo.html_url,
      status: active ? "ACTIVE" : "SHIPPED",
    });
  }

  if (projects.length === 0) {
    throw new Error("No projects selected — check the org name or API access.");
  }

  const outFile = fileURLToPath(OUT_PATH);
  writeFileSync(outFile, JSON.stringify(projects, null, 2) + "\n");
  console.log(`Wrote ${projects.length} projects to ${outFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
