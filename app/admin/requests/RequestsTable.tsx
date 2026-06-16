"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/8bit-toast";
import { PixelDataTable, type PixelColumn } from "@/components/admin/PixelDataTable";
import { STATUS_LABELS, type ApprovalStatus } from "@/lib/status";

interface Req {
  id: string;
  name: string | null;
  email: string | null;
  usn: string | null;
  branch: string | null;
  year: number | null;
  githubUsername: string;
  status: string;
}

export function RequestsTable({ initialRequests }: { initialRequests: Req[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const setStatus = (userId: string, status: ApprovalStatus) =>
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/members/${userId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        if (!res.ok) throw new Error(await res.text());
        router.refresh();
        toast.success(`MEMBER_${status.toUpperCase()}`);
      } catch (err) {
        toast.error("ACTION_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"));
      }
    });

  const btn = "retro border-2 px-3 py-1 text-[8px] transition-colors disabled:opacity-50";

  const columns: PixelColumn<Req>[] = [
    {
      key: "name",
      header: "NAME",
      render: (r) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{r.name || "UNNAMED"}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter">{r.email}</span>
        </div>
      ),
    },
    { key: "usn", header: "USN", render: (r) => <span className="text-white/70">{r.usn || "N_A"}</span> },
    {
      key: "branch",
      header: "BRANCH/YEAR",
      render: (r) => <span className="text-white/70">{r.branch ? `${r.branch} (${r.year}Y)` : "N/A"}</span>,
    },
    { key: "github", header: "GITHUB", render: (r) => <span className="text-white/70">{r.githubUsername}</span> },
    {
      key: "status",
      header: "STATUS",
      render: (r) => (
        <span
          className={`retro text-[9px] ${
            r.status === "rejected" ? "text-red-500" : "text-[#22c55e]"
          }`}
        >
          {STATUS_LABELS[r.status as ApprovalStatus] ?? r.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      align: "right",
      render: (r) => (
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={isPending || r.status === "approved"}
            onClick={() => setStatus(r.id, "approved")}
            className={`${btn} border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black`}
          >
            APPROVE
          </button>
          <button
            type="button"
            disabled={isPending || r.status === "rejected"}
            onClick={() => setStatus(r.id, "rejected")}
            className={`${btn} border-red-500/40 text-red-400 hover:bg-red-500/10`}
          >
            REJECT
          </button>
        </div>
      ),
    },
  ];

  return <PixelDataTable data={initialRequests} columns={columns} empty="NO PENDING REQUESTS" />;
}
