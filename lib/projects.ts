// Render shape for the public Projects carousel (components/home/ProjectsSection).
// Both DB row flavours map into this interface — member submissions and
// GitHub-org imports (synced from the admin panel, pending until approved) —
// so the carousel only ever sees approved projects from one source of truth.

export interface ProjectData {
  id: string;
  title: string;
  /** Cover image URL, or null to render the 8-bit placeholder. */
  imageUrl: string | null;
  description: string;
  techStack: string[];
  githubUrl: string | null;
  /** Optional live/demo URL. GitHub-imported projects omit it. */
  demoUrl?: string | null;
  /** Short status tag, e.g. "ACTIVE" / "SHIPPED" / "WIP". */
  status: string;
  /**
   * Completion 0–100, as set by the project lead in the "new project" modal and
   * maintained by admins. Null/absent for GitHub-imported projects, which have
   * no such figure — the UI omits the meter entirely rather than implying 0%.
   */
  progressPct?: number | null;
}
