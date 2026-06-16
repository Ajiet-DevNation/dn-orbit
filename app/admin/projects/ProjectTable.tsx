"use client";

import React, { useTransition, useOptimistic } from "react";
import { PixelDataTable, type PixelColumn } from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { deleteProject } from "./actions";
import { useRouter } from "next/navigation";

type ReviewStatus = "pending" | "approved" | "rejected";

interface Project {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progressPct: number;
  githubRepoUrl: string | null;
  reviewStatus: ReviewStatus;
  submittedAt: Date;
  leadName: string;
  leadGithub: string | null;
}

interface ProjectTableProps {
  initialProjects: Project[];
}

export function ProjectTable({ initialProjects }: ProjectTableProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [optimisticProjects, addOptimisticAction] = useOptimistic(
    initialProjects,
    (state, action: { type: "approve" | "reject" | "delete"; id: string }) => {
      if (action.type === "approve") {
        return state.map((p) =>
          p.id === action.id ? { ...p, reviewStatus: "approved" as const } : p,
        );
      }
      if (action.type === "reject") {
        return state.map((p) =>
          p.id === action.id ? { ...p, reviewStatus: "rejected" as const } : p,
        );
      }
      if (action.type === "delete") {
        return state.filter((p) => p.id !== action.id);
      }
      return state;
    }
  );

  const handleReview = async (id: string, action: "approve" | "reject") => {
    startTransition(async () => {
      addOptimisticAction({ type: action, id });
      try {
        const res = await fetch(`/api/admin/projects/${id}/approve`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success(action === "approve" ? "PROJECT_APPROVED" : "PROJECT_REJECTED");
      } catch (err) {
        toast.error(
          action.toUpperCase() +
            "_FAILURE: " +
            (err instanceof Error ? err.message : "UNKNOWN")
        );
      }
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("CONFIRM_PROJECT_DELETION? THIS ACTION IS IRREVERSIBLE.")) return;
    startTransition(async () => {
      addOptimisticAction({ type: "delete", id });
      try {
        await deleteProject(id);
        toast.success("PROJECT_RECORD_ERASED");
      } catch (err) {
        toast.error(
          "DELETION_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN")
        );
      }
    });
  };

  const btn = "retro border-2 px-3 py-1 text-[8px] transition-colors disabled:opacity-50";

  const columns: PixelColumn<Project>[] = [
    {
      key: "title",
      header: "PROJECT",
      render: (p) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{p.title}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter uppercase line-clamp-1">
            {p.description || "NO_DESCRIPTION_PROVIDED"}
          </span>
        </div>
      ),
    },
    {
      key: "lead",
      header: "COMMAND_LEAD",
      render: (p) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{p.leadName.toUpperCase()}</span>
          <span className="text-[9px] text-zinc-700 tracking-widest">
            {p.leadGithub ? `@${p.leadGithub}` : "NO_GITHUB"}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (p) => (
        <div className="flex items-center gap-4">
          <span
            className={`retro inline-block border-2 px-2 py-1 text-[8px] ${
              p.status === "completed"
                ? "border-white bg-white text-black"
                : "border-white/10 text-zinc-500"
            }`}
          >
            {p.status.toUpperCase()}
          </span>
          <span className="retro text-[9px] tabular-nums text-zinc-400">{p.progressPct}%</span>
        </div>
      ),
    },
    {
      key: "approval",
      header: "REVIEW",
      render: (p) => (
        <span
          className={`retro inline-block border-2 px-2 py-1 text-[8px] uppercase ${
            p.reviewStatus === "approved"
              ? "border-[#22c55e]/30 text-[#22c55e]"
              : p.reviewStatus === "rejected"
                ? "border-red-900 bg-red-900/20 italic text-red-500"
                : "border-amber-500/40 text-amber-400"
          }`}
        >
          {p.reviewStatus}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (p) => (
        <div className="flex justify-end gap-2">
          {p.reviewStatus !== "approved" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleReview(p.id, "approve")}
              className={`${btn} border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black`}
            >
              APPROVE
            </button>
          )}
          {p.reviewStatus !== "rejected" && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleReview(p.id, "reject")}
              className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
            >
              REJECT
            </button>
          )}
          <button
            type="button"
            disabled={isPending}
            onClick={() => handleDelete(p.id)}
            className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
          >
            DELETE
          </button>
        </div>
      ),
    },
  ];

  return (
    <PixelDataTable data={optimisticProjects} columns={columns} empty="NO PROJECTS" />
  );
}
