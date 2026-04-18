"use client";

import React, { useTransition, useOptimistic, useState } from "react";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { TacticalFeedback } from "@/components/ui/TacticalFeedback";
import { deleteProject } from "./actions";
import { useRouter } from "next/navigation";

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
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const router = useRouter();

  const [optimisticProjects, addOptimisticAction] = useOptimistic(
    initialProjects,
    (state, action: { type: 'approve' | 'delete', id: string }) => {
      if (action.type === 'approve') {
        return state.map(p => p.id === action.id ? { ...p, isApproved: true } : p);
      }
      if (action.type === 'delete') {
        return state.filter(p => p.id !== action.id);
      }
      return state;
    }
  );

  const handleApprove = async (id: string) => {
    startTransition(async () => {
      addOptimisticAction({ type: 'approve', id });
      try {
        const res = await fetch(`/api/admin/projects/${id}/approve`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isApproved: true })
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        setFeedback({ message: "PROJECT_CLEARANCE_GRANTHED", type: "success" });
      } catch (err) {
        setFeedback({ 
          message: "APPROVE_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"), 
          type: "error" 
        });
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("CONFIRM_PROJECT_DELETION? THIS ACTION IS IRREVERSIBLE.")) return;
    startTransition(async () => {
      addOptimisticAction({ type: 'delete', id });
      try {
        await deleteProject(id);
        setFeedback({ message: "PROJECT_RECORD_ERASED", type: "success" });
      } catch (err) {
        setFeedback({ 
          message: "DELETION_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"), 
          type: "error" 
        });
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

  return (
    <>
      <TacticalTable data={optimisticProjects} columns={columns} id="PRJ_REGISTRY_V2" />
      <TacticalFeedback 
        key={feedback?.message || "none"}
        message={feedback?.message || null} 
        type={feedback?.type || "success"} 
        onClear={() => setFeedback(null)}
      />
    </>
  );
}
