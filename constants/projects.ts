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
  /** Short status tag, e.g. "ACTIVE" / "SHIPPED" / "WIP". */
  status: string;
}

export const PROJECTS: ProjectData[] = githubProjects;
