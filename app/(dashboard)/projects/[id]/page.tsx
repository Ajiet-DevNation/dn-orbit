import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { TacticalCard } from "@/components/ui/TacticalCard";
import {
  ArrowLeft,
  CodeXml,
  CheckCircle2,
  Circle,
  ExternalLink,
} from "lucide-react";

type Milestone = { label: string; done: boolean };

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400 text-black",
  planning: "bg-amber-400 text-black",
  completed: "bg-white text-black",
  stalled: "bg-red-400 text-black",
};

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id, isApproved: true },
    include: {
      lead: { select: { name: true, githubUsername: true, image: true } },
      members: {
        include: {
          user: { select: { name: true, githubUsername: true, image: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!project) notFound();

  const techStack = Array.isArray(project.techStack)
    ? (project.techStack as string[])
    : [];
  const milestones = Array.isArray(project.milestones)
    ? (project.milestones as Milestone[])
    : [];
  const completedMilestones = milestones.filter((m) => m.done).length;

  return (
    <div className="p-8 space-y-12">
      {/* Header */}
      <header className="border-b border-zinc-900 pb-12 space-y-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-2 text-[9px] text-zinc-600 tracking-[0.3em] uppercase hover:text-zinc-400 transition-colors"
        >
          <ArrowLeft className="w-3 h-3" />
          ALL_PROJECTS
        </Link>

        <div className="flex items-start justify-between gap-6">
          <div className="space-y-3 min-w-0">
            <h1 className="text-5xl md:text-7xl font-black uppercase tracking-tighter leading-none italic">
              {project.title}
            </h1>
            {project.lead && (
              <p className="text-[10px] text-zinc-500 tracking-[0.3em] uppercase">
                COMMAND_LEAD:{" "}
                {project.lead.name ?? project.lead.githubUsername}
              </p>
            )}
          </div>
          <span
            className={`shrink-0 mt-2 text-[10px] px-3 py-1.5 font-black tracking-widest uppercase ${
              STATUS_COLORS[project.status] ?? "bg-zinc-800 text-zinc-400"
            }`}
          >
            {project.status.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Two-column body */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-10">
          {/* Description */}
          {project.description && (
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  MISSION_BRIEF
                </h2>
                <div className="h-px flex-1 bg-zinc-900" />
              </div>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {project.description}
              </p>
            </section>
          )}

          {/* Progress + Milestones */}
          <section className="space-y-4">
            <div className="flex items-center gap-4">
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                OPERATIONAL_PROGRESS
              </h2>
              <div className="h-px flex-1 bg-zinc-900" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
                  {completedMilestones}/{milestones.length} MILESTONES_COMPLETE
                </span>
                <span className="text-[9px] text-zinc-500 tracking-widest uppercase">
                  {project.progressPct}%
                </span>
              </div>
              <div className="h-1.5 bg-zinc-900 overflow-hidden">
                <div
                  className="h-full bg-white transition-all duration-700"
                  style={{ width: `${project.progressPct}%` }}
                />
              </div>
            </div>

            {milestones.length > 0 && (
              <div className="mt-4 space-y-1">
                {milestones.map((m, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 border-b border-zinc-900 last:border-0"
                  >
                    {m.done ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-zinc-700 shrink-0" />
                    )}
                    <span
                      className={`text-xs tracking-wide ${
                        m.done
                          ? "line-through text-zinc-600"
                          : "text-zinc-300"
                      }`}
                    >
                      {m.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Tech stack */}
          {techStack.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">
                  TECH_STACK
                </h2>
                <div className="h-px flex-1 bg-zinc-900" />
              </div>
              <div className="flex flex-wrap gap-2">
                {techStack.map((tech) => (
                  <span
                    key={tech}
                    className="text-[10px] text-zinc-300 border border-zinc-700 px-3 py-1.5 tracking-widest uppercase font-black"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6 lg:sticky lg:top-8 self-start">
          {/* Project metadata */}
          <TacticalCard id="PROJECT_META" title="METADATA">
            <div className="space-y-4 -mt-2">
              {project.lead && (
                <div className="space-y-1">
                  <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                    COMMAND_LEAD
                  </span>
                  <p className="text-sm text-white font-black uppercase">
                    {project.lead.name ?? project.lead.githubUsername}
                  </p>
                  {project.lead.githubUsername && (
                    <p className="text-[10px] text-zinc-500">
                      @{project.lead.githubUsername}
                    </p>
                  )}
                </div>
              )}

              <div className="border-t border-zinc-900" />

              <div className="space-y-1">
                <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                  SUBMITTED
                </span>
                <p className="text-xs text-zinc-300">
                  {project.submittedAt
                    .toLocaleDateString("en-CA")
                    .replace(/-/g, ".")}
                </p>
              </div>

              <div className="border-t border-zinc-900" />

              <div className="space-y-1">
                <span className="text-[9px] text-zinc-600 tracking-widest uppercase">
                  TEAM_SIZE
                </span>
                <p className="text-xs text-zinc-300">
                  {project.members.length} OPERATIVES
                </p>
              </div>

              {project.githubRepoUrl && (
                <>
                  <div className="border-t border-zinc-900" />
                  <a
                    href={project.githubRepoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] text-zinc-400 hover:text-white transition-colors tracking-widest uppercase"
                  >
                    <CodeXml className="w-3 h-3" />
                    VIEW_REPOSITORY
                    <ExternalLink className="w-2.5 h-2.5 ml-auto" />
                  </a>
                </>
              )}
            </div>
          </TacticalCard>

          {/* Team roster */}
          {project.members.length > 0 && (
            <TacticalCard id="TEAM_ROSTER" title="OPERATIVES">
              <div className="space-y-0 -mt-2">
                {project.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between gap-3 py-2.5 border-b border-zinc-900 last:border-0"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-xs text-white font-black uppercase truncate">
                        {member.user.name ?? member.user.githubUsername}
                      </p>
                      <p className="text-[9px] text-zinc-600">
                        @{member.user.githubUsername}
                      </p>
                    </div>
                    <span className="shrink-0 text-[8px] border border-zinc-700 px-1.5 py-0.5 text-zinc-400 tracking-widest uppercase">
                      {(member.role ?? "MEMBER").toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </TacticalCard>
          )}
        </aside>
      </div>
    </div>
  );
}
