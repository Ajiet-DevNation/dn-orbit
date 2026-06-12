"use client";

import { useRouter } from "next/navigation";
import { CodeXml, ArrowRight } from "lucide-react";

type Milestone = { label: string; done: boolean };

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-400 text-black",
  planning: "bg-amber-400 text-black",
  completed: "bg-white text-black",
  stalled: "bg-red-400 text-black",
};

interface ProjectClientCardProps {
  project: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    progressPct: number;
    githubRepoUrl: string | null;
    techStack: unknown;
    milestones: unknown;
    lead: { name: string | null; githubUsername: string } | null;
    _count: { members: number };
  };
}

export function ProjectClientCard({ project }: ProjectClientCardProps) {
  const router = useRouter();

  const techStack = Array.isArray(project.techStack) ? (project.techStack as string[]) : [];
  const milestones = Array.isArray(project.milestones) ? (project.milestones as Milestone[]) : [];
  const completedMilestones = milestones.filter((m) => m.done).length;

  return (
    <div
      onClick={() => router.push(`/projects/${project.id}`)}
      className="border border-zinc-900 hover:border-zinc-700 p-6 space-y-5 transition-colors cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h3 className="text-lg font-black uppercase tracking-tighter text-white truncate group-hover:text-zinc-200 transition-colors">
            {project.title}
          </h3>
          {project.lead && (
            <p className="text-[9px] text-zinc-500 tracking-widest uppercase">
              LEAD: {project.lead.name ?? project.lead.githubUsername}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={`text-[8px] px-2 py-1 font-black tracking-widest uppercase ${
              STATUS_COLORS[project.status] ?? "bg-zinc-800 text-zinc-400"
            }`}
          >
            {project.status.toUpperCase()}
          </span>
          <ArrowRight className="w-3 h-3 text-zinc-700 group-hover:text-zinc-400 transition-colors" />
        </div>
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
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">PROGRESS</span>
          <span className="text-[9px] text-zinc-500 tracking-widest uppercase">{project.progressPct}%</span>
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
            onClick={(e) => e.stopPropagation()}
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
