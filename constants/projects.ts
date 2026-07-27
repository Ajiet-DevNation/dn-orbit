// Real project showcase data, scraped from the DevNation GitHub org into
// githubProjects.json by scripts/scrapeProjects.ts (run `bun run scrape:projects`
// to refresh). Shapes mirror what the Projects module will eventually serve from
// the DB (see prisma `Project`), so swapping this for a server fetch later is a
// drop-in: same fields, same types.

import githubProjects from "./githubProjects.json";

export interface ProjectData {
  id: string;
  title: string;
  /** Cover image URL, or null to render the 8-bit placeholder. */
  imageUrl: string | null;
  description: string;
  techStack: string[];
  githubUrl: string | null;
  /** Optional live/demo URL. Scraped projects omit it. */
  demoUrl?: string | null;
  /** Short status tag, e.g. "ACTIVE" / "SHIPPED" / "WIP". */
  status: string;
  /**
   * Completion 0–100, as set by the project lead in the "new project" modal and
   * maintained by admins. Null for GitHub-scraped projects, which have no such
   * figure — the UI omits the meter entirely rather than implying 0%.
   */
  progressPct?: number | null;
}

export const PROJECTS: ProjectData[] = githubProjects;
