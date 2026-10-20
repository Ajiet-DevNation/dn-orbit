"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/8bit-select";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";
import { errorMessage } from "@/lib/utils";
import {
  deleteProject,
  updateProjectImage,
  updateProjectProgress,
  updateProjectStatus,
} from "./actions";
import { CoverImageDialog } from "./CoverImageDialog";

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
  /** Admin-pasted cover; null means "fall back" (auto cover / placeholder). */
  imageUrl: string | null;
  status: string;
  /** Null for GitHub imports — the meter has no figure to show. */
  progressPct: number | null;
  githubRepoUrl: string | null;
  /** "owner/name" for GitHub imports; null for member submissions. */
  githubRepoFullName: string | null;
  source: "manual" | "github";
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
        className="retro w-12 border-2 border-white/15 bg-black/40 px-1.5 py-1 text-[9px] tabular-nums text-zinc-200 outline-none focus:border-brand/50 disabled:opacity-50"
      />
      <span className="retro text-[9px] text-zinc-500">%</span>
    </div>
  );
}

export function ProjectTable({ initialProjects }: ProjectTableProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();
  // Row whose cover is open in the editor dialog; null = dialog closed.
  const [coverEdit, setCoverEdit] = useState<Project | null>(null);

  const [optimisticProjects, addOptimisticAction] = useOptimistic(
    initialProjects,
    (
      state,
      action:
        | { type: "approve" | "reject" | "delete"; id: string }
        | { type: "status"; id: string; status: ProjectStatus }
        | { type: "progress"; id: string; progressPct: number }
        | { type: "image"; id: string; imageUrl: string | null },
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
      if (action.type === "image") {
        return state.map((p) =>
          p.id === action.id ? { ...p, imageUrl: action.imageUrl } : p,
        );
      }
      if (action.type === "delete") {
        return state.filter((p) => p.id !== action.id);
      }
      return state;
    },
  );

  const handleStatus = (id: string, status: ProjectStatus) => {
    startTransition(async () => {
      addOptimisticAction({ type: "status", id, status });
      try {
        await updateProjectStatus(id, status);
        toast.success("Status updated");
      } catch (err) {
        toast.error(
          `STATUS_FAILURE: ${err instanceof Error ? err.message : "UNKNOWN"}`,
        );
      }
    });
  };

  const handleProgress = (id: string, progressPct: number) => {
    startTransition(async () => {
      addOptimisticAction({ type: "progress", id, progressPct });
      try {
        await updateProjectProgress(id, progressPct);
        toast.success("Progress updated");
      } catch (err) {
        toast.error(
          "PROGRESS_FAILURE: " +
            (err instanceof Error ? err.message : "UNKNOWN"),
        );
      }
    });
  };

  // Paste-URL cover save. The dialog stays open on failure so the admin can
  // see the error and retry; on success it closes and the optimistic row (the
  // thumbnail) already shows the new image.
  const handleImageSave = (id: string, imageUrl: string | null) => {
    startTransition(async () => {
      addOptimisticAction({ type: "image", id, imageUrl });
      try {
        await updateProjectImage(id, imageUrl);
        setCoverEdit(null);
        toast.success("Cover image updated");
      } catch (err) {
        toast.error(
          `IMAGE_FAILURE: ${err instanceof Error ? err.message : "UNKNOWN"}`,
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
        if (!res.ok) throw new Error(await errorMessage(res));
        router.refresh();
        toast.success(
          action === "approve" ? "Project approved" : "Project rejected",
        );
      } catch (err) {
        toast.error(
          action.toUpperCase() +
            "_FAILURE: " +
            (err instanceof Error ? err.message : "UNKNOWN"),
        );
      }
    });
  };

  const handleDelete = async (id: string) => {
    const ok = await confirm({
      title: "DELETE PROJECT",
      message: "CONFIRM_PROJECT_DELETION? THIS ACTION IS IRREVERSIBLE.",
      confirmLabel: "DELETE",
    });
    if (!ok) return;
    startTransition(async () => {
      addOptimisticAction({ type: "delete", id });
      try {
        await deleteProject(id);
        toast.success("Project deleted");
      } catch (err) {
        toast.error(
          "DELETION_FAILURE: " +
            (err instanceof Error ? err.message : "UNKNOWN"),
        );
      }
    });
  };

  const btn =
    "retro border-2 px-3 py-1 text-[8px] transition-colors disabled:opacity-50";

  const columns: PixelColumn<Project>[] = [
    {
      key: "cover",
      header: "COVER",
      render: (p) => {
        // The pasted image, or null — the public card then renders its
        // placeholder cartridge.
        const cover = p.imageUrl;
        return (
          <div className="flex flex-col items-start gap-1.5">
            <div className="aspect-[5/4] h-14 overflow-hidden border-2 border-white/15 bg-[#0d0d0d]">
              {cover ? (
                // biome-ignore lint/performance/noImgElement: arbitrary remote host — next/image would need per-host config
                <img
                  src={cover}
                  alt=""
                  loading="lazy"
                  // Dead link: show the empty tile, not a broken-image glyph.
                  onError={(e) => {
                    e.currentTarget.style.visibility = "hidden";
                  }}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="retro flex h-full items-center justify-center text-[8px] text-zinc-700">
                  —
                </span>
              )}
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => setCoverEdit(p)}
              className={`${btn} border-white/25 text-zinc-300 hover:bg-white/10`}
            >
              IMAGE
            </button>
          </div>
        );
      },
    },
    {
      key: "title",
      header: "PROJECT",
      render: (p) => (
        <div className="flex max-w-[18rem] flex-col sm:max-w-[26rem]">
          <span className="truncate text-white font-black">{p.title}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter uppercase line-clamp-1 break-all">
            {p.description || "NO DESCRIPTION"}
          </span>
        </div>
      ),
    },
    {
      key: "lead",
      header: "PROJECT LEAD",
      render: (p) =>
        p.source === "github" ? (
          // Org imports have no member lead — name the source instead of an
          // empty cell, and show the repo as the identifying detail.
          <div className="flex flex-col">
            <span className="text-white font-black">GITHUB IMPORT</span>
            <span className="text-[9px] text-zinc-700 tracking-widest">
              {p.githubRepoFullName ?? "—"}
            </span>
          </div>
        ) : (
          <div className="flex flex-col">
            <span className="text-white font-black">
              {p.leadName.toUpperCase()}
            </span>
            <span className="text-[9px] text-zinc-700 tracking-widest">
              {p.leadGithub ? `@${p.leadGithub}` : "—"}
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
            <SelectTrigger className="min-w-[8.5rem] data-[size=default]:h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[200] dark">
              {STATUS_OPTIONS.map((s) => (
                <SelectItem
                  key={s.value}
                  value={s.value}
                  className="text-[8px]"
                >
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ProgressInput
            value={p.progressPct ?? 0}
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
              ? "border-brand/30 text-brand-light"
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
              className={`${btn} border-brand text-brand-light hover:bg-brand hover:text-black`}
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
    <>
      <PixelDataTable
        data={optimisticProjects}
        columns={columns}
        empty="NO PROJECTS"
      />
      {/* key remounts the dialog per project so its local URL input resets. */}
      {coverEdit && (
        <CoverImageDialog
          key={coverEdit.id}
          project={coverEdit}
          busy={isPending}
          onOpenChange={(open) => {
            if (!open) setCoverEdit(null);
          }}
          onSave={(url) => handleImageSave(coverEdit.id, url)}
        />
      )}
      {dialog}
    </>
  );
}
