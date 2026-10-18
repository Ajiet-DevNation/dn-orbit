"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  type PixelColumn,
  PixelDataTable,
} from "@/components/admin/PixelDataTable";
import { toast } from "@/components/ui/8bit-toast";
import { useConfirm } from "@/components/ui/PixelConfirm";
import type { ApprovalStatus } from "@/lib/status";

interface Application {
  id: string;
  name: string;
  email: string;
  usn: string;
  branch: string;
  year: number;
  whatsapp: string;
  about: string;
  githubUsername: string;
  lcUsername: string;
  linkedinUrl: string | null;
  xHandle: string | null;
  cvPath: string | null;
  status: string;
  createdAt: string;
}

// "approved" in the DB reads as ACCEPTED here — recruitment vocabulary.
const STATUS_TEXT: Record<string, string> = {
  pending: "PENDING",
  approved: "ACCEPTED",
  rejected: "REJECTED",
};

const link = "text-[#22c55e] underline-offset-2 hover:underline";

export function RecruitmentsTable({
  applications,
}: {
  applications: Application[];
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const { confirm, dialog } = useConfirm();

  const submit = (id: string, status: Exclude<ApprovalStatus, "pending">) =>
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/recruitments/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success(
          status === "approved"
            ? "Application accepted"
            : "Application rejected",
        );
      } catch (err) {
        toast.error(
          `Update failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });

  // Rejecting is confirmed, like every other negative decision in the panel.
  const setStatus = async (
    a: Application,
    status: Exclude<ApprovalStatus, "pending">,
  ) => {
    if (status === "rejected") {
      const ok = await confirm({
        title: "REJECT APPLICATION",
        message: `Reject ${a.name}'s application?`,
        confirmLabel: "REJECT",
      });
      if (!ok) return;
    }
    submit(a.id, status);
  };

  // Deleting is permanent (row and CV file), so it is always confirmed.
  const remove = async (a: Application) => {
    const ok = await confirm({
      title: "DELETE APPLICATION",
      message: `Permanently delete ${a.name}'s application${a.cvPath ? " and CV" : ""}? This can't be undone.`,
      confirmLabel: "DELETE",
    });
    if (!ok) return;
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/recruitments/${a.id}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success("Application deleted");
      } catch (err) {
        toast.error(
          `Delete failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });
  };

  const btn =
    "retro border-2 px-3 py-1 text-[8px] transition-colors disabled:opacity-50";

  const columns: PixelColumn<Application>[] = [
    {
      key: "name",
      header: "APPLICANT",
      render: (a) => (
        <div className="flex flex-col gap-0.5">
          <span className="font-black text-white">{a.name}</span>
          <span className="text-[9px] tracking-tighter text-zinc-500">
            {a.usn} · {a.branch} · {a.year}Y
          </span>
          <span className="text-[9px] tracking-tighter text-zinc-600">
            {a.email} · {a.whatsapp}
          </span>
        </div>
      ),
    },
    {
      key: "profiles",
      header: "PROFILES",
      render: (a) => (
        <div className="flex flex-col gap-0.5 text-[10px]">
          <a
            href={`https://github.com/${a.githubUsername}`}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            GH: {a.githubUsername}
          </a>
          <a
            href={`https://leetcode.com/u/${a.lcUsername}`}
            target="_blank"
            rel="noreferrer"
            className={link}
          >
            LC: {a.lcUsername}
          </a>
          {a.linkedinUrl && (
            <a
              href={a.linkedinUrl}
              target="_blank"
              rel="noreferrer"
              className={link}
            >
              LINKEDIN
            </a>
          )}
          {a.xHandle && (
            <a
              href={`https://x.com/${a.xHandle}`}
              target="_blank"
              rel="noreferrer"
              className={link}
            >
              X: @{a.xHandle}
            </a>
          )}
          {/* Private bucket: this route signs a one-minute URL and redirects. */}
          {a.cvPath && (
            <a
              href={`/api/admin/recruitments/${a.id}/cv`}
              target="_blank"
              rel="noreferrer"
              className={link}
            >
              CV ↗
            </a>
          )}
        </div>
      ),
    },
    {
      key: "about",
      header: "ABOUT",
      render: (a) => (
        <details className="max-w-xs text-[11px] text-white/70">
          <summary className="retro cursor-pointer text-[8px] text-zinc-500 hover:text-[#22c55e]">
            READ
          </summary>
          <p className="mt-2 whitespace-pre-wrap break-words leading-relaxed">
            {a.about}
          </p>
        </details>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      render: (a) => (
        <span
          className={`retro text-[9px] ${
            a.status === "rejected"
              ? "text-red-500"
              : a.status === "approved"
                ? "text-[#22c55e]"
                : "text-zinc-400"
          }`}
        >
          {STATUS_TEXT[a.status] ?? a.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (a) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isPending || a.status === "approved"}
            onClick={() => setStatus(a, "approved")}
            className={`${btn} border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black`}
          >
            ACCEPT
          </button>
          <button
            type="button"
            disabled={isPending || a.status === "rejected"}
            onClick={() => setStatus(a, "rejected")}
            className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
          >
            REJECT
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => remove(a)}
            className={`${btn} border-white/20 text-zinc-400 hover:border-red-500/60 hover:text-red-400`}
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
        data={applications}
        columns={columns}
        empty="NO APPLICATIONS YET"
      />
      {dialog}
    </>
  );
}
