import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { CodeXml } from "lucide-react";

/**
 * Projects page — Shows all approved club projects.
 *
 * Server Component. Only approved projects are visible to members.
 * Each project card shows progress, tech stack, and milestones.
 * Per AGENTS.md, progress_pct = (completed milestones / total) × 100.
 */
export default async function ProjectsPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const projects = await db.project.findMany({
    where: { isApproved: true },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      progressPct: true,
      githubRepoUrl: true,
      techStack: true,
      milestones: true,
      submittedAt: true,
      lead: {
        select: {
          name: true,
          githubUsername: true,
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { submittedAt: "desc" },
  });

  const statusCounts = {
    active: projects.filter((p) => p.status === "active").length,
    planning: projects.filter((p) => p.status === "planning").length,
    completed: projects.filter((p) => p.status === "completed").length,
  };

  return (
    <div className="p-8 space-y-12">
      <header className="border-b border-zinc-900 pb-12">
        <h1 className="text-7xl md:text-8xl font-black uppercase tracking-tighter leading-none italic">
          PROJECTS
        </h1>
        <div className="flex items-center gap-4 mt-4">
          <span className="text-[10px] text-zinc-600 tracking-[0.4em] uppercase font-bold">
            ORBIT_PROJECT_ARCHIVE
          </span>
          <div className="h-px flex-1 bg-zinc-900" />
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            {projects.length.toString().padStart(2, "0")}_APPROVED_PROJECTS
          </span>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <TacticalCard id="0xACTIVE" title="ACTIVE">
          <span className="text-4xl font-black italic text-emerald-400">
            {statusCounts.active.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
        <TacticalCard id="0xPLAN" title="PLANNING">
          <span className="text-4xl font-black italic text-amber-400">
            {statusCounts.planning.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
        <TacticalCard id="0xDONE" title="COMPLETED">
          <span className="text-4xl font-black italic text-white">
            {statusCounts.completed.toString().padStart(2, "0")}
          </span>
        </TacticalCard>
      </div>

      {/* Project list */}
      <section className="space-y-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-black uppercase tracking-tighter">
            ALL_PROJECTS
          </h2>
          <div className="h-px flex-1 bg-zinc-900" />
        </div>

        {projects.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        ) : (
          <TacticalCard id="0xNULL" title="NO_PROJECTS" variant="dashed">
            <p className="text-[10px] text-zinc-600 tracking-widest uppercase">
              NO_APPROVED_PROJECTS_IN_THE_ARCHIVE
            </p>
          </TacticalCard>
        )}
      </section>
    </div>
  );
}

/* ── Sub-components ── */

type Milestone = { label: string; done: boolean };

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400 text-black",
  planning: "bg-amber-400 text-black",
  completed: "bg-white text-black",
  stalled: "bg-red-400 text-black",
};

function ProjectCard({
  project,
}: {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    progressPct: number;
    githubRepoUrl: string | null;
    techStack: unknown;
    milestones: unknown;
    submittedAt: Date;
    lead: { name: string | null; githubUsername: string } | null;
    _count: { members: number };
  };
}) {
  const techStack = Array.isArray(project.techStack)
    ? (project.techStack as string[])
    : [];

  const milestones = Array.isArray(project.milestones)
    ? (project.milestones as Milestone[])
    : [];

  const completedMilestones = milestones.filter((m) => m.done).length;

  return (
    <div className="border border-zinc-900 hover:border-zinc-800 p-6 space-y-5 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter text-white truncate">
            {project.title}
          </h3>
          {project.lead && (
            <p className="text-[9px] text-zinc-500 tracking-widest uppercase">
              LEAD: {project.lead.name ?? project.lead.githubUsername}
            </p>
          )}
        </div>
        <span
          className={`shrink-0 text-[8px] px-2 py-1 font-black tracking-widest uppercase ${
            STATUS_COLORS[project.status] ?? "bg-zinc-800 text-zinc-400"
          }`}
        >
          {project.status.toUpperCase()}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            PROGRESS
          </span>
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
            {project.progressPct}%
          </span>
        </div>
        <div className="h-1 bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500"
            style={{ width: `${project.progressPct}%` }}
          />
        </div>
        {milestones.length > 0 && (
          <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
            {completedMilestones}/{milestones.length} MILESTONES
          </span>
        )}
      </div>

      {/* Tech stack */}
      {techStack.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {techStack.map((tech) => (
            <span
              key={tech}
              className="text-[9px] text-zinc-400 border border-zinc-800 px-2 py-1 tracking-widest uppercase"
            >
              {tech}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="pt-4 border-t border-zinc-900 flex items-center justify-between text-[10px] text-zinc-500 tracking-widest uppercase">
        <span>{project._count.members} MEMBERS</span>
        {project.githubRepoUrl && (
          <a
            href={project.githubRepoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 hover:text-white transition-colors"
          >
            <CodeXml className="w-3 h-3" />
            REPO
          </a>
        )}
      </div>
    </div>
  );
}
