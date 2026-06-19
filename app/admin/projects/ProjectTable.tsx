"use client";

import React, { useTransition, useOptimistic } from "react";
import { PixelDataTable, type PixelColumn } from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { deleteProject, updateProjectStatus, updateProjectProgress } from "./actions";
import { useRouter } from "next/navigation";

type ReviewStatus = "pending" | "approved" | "rejected";

// DB enum values (prisma ProjectStatus) paired with friendlier labels. Values
// must stay in sync with the enum / updateProjectStatus signature.
type ProjectStatus = "planning" | "active" | "completed" | "stalled";
const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "planning", label: "PLANNING" },
  { value: "active", label: "BUILDING" },
  { value: "completed", label: "COMPLETED" },
  { value: "stalled", label: "STALLED" },
];

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

// Editable 0–100 progress cell. Uncontrolled (typing stays local); `key={value}`
// remounts it to the latest committed value, so it resets after a save without a
// state-syncing effect. Commits on blur / Enter, only when the value changed.
function ProgressInput({
  value,
  disabled,
  onCommit,
}: {
  value: number;
  disabled?: boolean;
  onCommit: (n: number) => void;
}) {
  const commit = (el: HTMLInputElement) => {
    const n = Math.max(0, Math.min(100, Math.round(Number(el.value) || 0)));
    el.value = String(n);
    if (n !== value) onCommit(n);
  };

  return (
    <div className="flex items-center gap-1">
      <input
        key={value}
        type="number"
        min={0}
        max={100}
        defaultValue={value}
        disabled={disabled}
        aria-label="Progress percent"
        onBlur={(e) => commit(e.currentTarget)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className="retro w-12 border-2 border-white/15 bg-black/40 px-1.5 py-1 text-[9px] tabular-nums text-zinc-200 outline-none focus:border-[#22c55e]/50 disabled:opacity-50"
      />
      <span className="retro text-[9px] text-zinc-500">%</span>
    </div>
  );
}

export function ProjectTable({ initialProjects }: ProjectTableProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [optimisticProjects, addOptimisticAction] = useOptimistic(
    initialProjects,
    (
      state,
      action:
        | { type: "approve" | "reject" | "delete"; id: string }
        | { type: "status"; id: string; status: ProjectStatus }
        | { type: "progress"; id: string; progressPct: number },
    ) => {
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
      if (action.type === "status") {
        return state.map((p) =>
          p.id === action.id ? { ...p, status: action.status } : p,
        );
      }
      if (action.type === "progress") {
        return state.map((p) =>
          p.id === action.id ? { ...p, progressPct: action.progressPct } : p,
        );
      }
      if (action.type === "delete") {
        return state.filter((p) => p.id !== action.id);
      }
      return state;
    }
  );

  const handleStatus = (id: string, status: ProjectStatus) => {
    startTransition(async () => {
      addOptimisticAction({ type: "status", id, status });
      try {
        await updateProjectStatus(id, status);
        toast.success("STATUS_UPDATED");
      } catch (err) {
        toast.error(
          "STATUS_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"),
        );
      }
    });
  };

  const handleProgress = (id: string, progressPct: number) => {
    startTransition(async () => {
      addOptimisticAction({ type: "progress", id, progressPct });
      try {
        await updateProjectProgress(id, progressPct);
        toast.success("PROGRESS_UPDATED");
      } catch (err) {
        toast.error(
          "PROGRESS_FAILURE: " + (err instanceof Error ? err.message : "UNKNOWN"),
        );
      }
    });
  };

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
        <div className="flex items-center gap-3">
          <Select
            value={p.status}
            onValueChange={(v) => handleStatus(p.id, v as ProjectStatus)}
            disabled={isPending}
          >
            <SelectTrigger className="h-auto min-w-[8.5rem] py-1 text-[8px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200] dark">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-[8px]">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ProgressInput
            value={p.progressPct}
            disabled={isPending}
            onCommit={(n) => handleProgress(p.id, n)}
          />
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
