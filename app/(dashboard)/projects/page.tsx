import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";
import { ProjectClientCard } from "./ProjectClientCard";

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
          <Link
            href="/projects/new"
            className="text-[9px] font-black tracking-[0.3em] uppercase border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-white hover:text-black transition-colors shrink-0"
          >
            + SUBMIT_PROJECT
          </Link>
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
              <ProjectClientCard
                key={project.id}
                project={{
                  id: project.id,
                  title: project.title,
                  description: project.description,
                  status: project.status,
                  progressPct: project.progressPct,
                  githubRepoUrl: project.githubRepoUrl,
                  techStack: project.techStack,
                  milestones: project.milestones,
                  lead: project.lead,
                  _count: project._count,
                }}
              />
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

