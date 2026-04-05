"use client";

import React, { useTransition } from "react";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { approveProject, deleteProject } from "./actions";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progressPct: number;
  githubRepoUrl: string | null;
  isApproved: boolean;
  submittedAt: Date;
  leadName: string;
  leadGithub: string | null;
}

interface ProjectTableProps {
  initialProjects: Project[];
}

export function ProjectTable({ initialProjects }: ProjectTableProps) {
  const [isPending, startTransition] = useTransition();

  const handleApprove = async (id: string) => {
    startTransition(async () => {
      try {
        await approveProject(id);
      } catch (err) {
        alert("APPROVE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("CONFIRM_PROJECT_DELETION? THIS ACTION IS IRREVERSIBLE.")) return;
    startTransition(async () => {
      try {
        await deleteProject(id);
      } catch (err) {
        alert("DELETION_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });
  };

  const columns = [
    { 
      key: "title",
      header: "PROJECT", 
      render: (p: Project) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{p.title}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter uppercase line-clamp-1">{p.description || "NO_DESCRIPTION_PROVIDED"}</span>
        </div>
      ) 
    },
    { 
      key: "lead",
      header: "COMMAND_LEAD", 
      render: (p: Project) => (
        <div className="flex flex-col">
          <span className="text-white font-black italic">{p.leadName.toUpperCase()}</span>
          <span className="text-[9px] text-zinc-700 tracking-widest">{p.leadGithub ? `@${p.leadGithub}` : "NO_GITHUB"}</span>
        </div>
      ) 
    },
    { 
      key: "status",
      header: "STATUS", 
      render: (p: Project) => (
        <div className="flex items-center gap-4">
          <div className={`px-2 py-0.5 text-[9px] font-black border ${
            p.status === 'completed' ? 'bg-white text-black border-white' : 'bg-transparent text-zinc-500 border-zinc-800'
          }`}>
            {p.status.toUpperCase()}
          </div>
          <span className="text-[10px] tabular-nums text-zinc-400">{p.progressPct}%</span>
        </div>
      ) 
    },
    { 
      key: "approval",
      header: "CLEARANCE", 
      render: (p: Project) => (
        <div className={`px-2 py-0.5 inline-block text-[9px] font-black border ${
          p.isApproved ? 'bg-transparent text-white border-white/20 uppercase' : 'bg-red-900/20 text-red-500 border-red-900 uppercase italic'
        }`}>
          {p.isApproved ? "VERIFIED" : "PENDING"}
        </div>
      ) 
    },
    { 
      key: "actions",
      header: "ACTIONS", 
      render: (p: Project) => (
        <div className="flex justify-end gap-2 text-right">
          {!p.isApproved && (
            <TacticalButton 
              variant="primary" 
              size="sm" 
              prefix=""
              disabled={isPending}
              onClick={() => handleApprove(p.id)}
            >
              APPROVE
            </TacticalButton>
          )}
          <TacticalButton 
            variant="danger" 
            size="sm" 
            prefix=""
            disabled={isPending}
            onClick={() => handleDelete(p.id)}
          >
            DELETE
          </TacticalButton>
        </div>
      ) 
    }
  ];

  return <TacticalTable data={initialProjects} columns={columns} id="PRJ_REGISTRY_V2" />;
}
