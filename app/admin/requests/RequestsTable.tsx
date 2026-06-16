"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TacticalTable } from "@/components/ui/TacticalTable";
import { TacticalButton } from "@/components/ui/TacticalButton";
import { TacticalFeedback } from "@/components/ui/TacticalFeedback";
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
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
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
        setFeedback({ message: `MEMBER_${status.toUpperCase()}`, type: "success" });
      } catch (err) {
        setFeedback({
          message: "ACTION_FAILED: " + (err instanceof Error ? err.message : "UNKNOWN"),
          type: "error",
        });
      }
    });

  const columns = [
    {
      key: "name",
      header: "NAME",
      render: (r: Req) => (
        <div className="flex flex-col">
          <span className="text-white font-black">{r.name || "UNNAMED"}</span>
          <span className="text-[9px] text-zinc-600 tracking-tighter">{r.email}</span>
        </div>
      ),
    },
    { key: "usn", header: "USN", render: (r: Req) => r.usn || "N_A" },
    {
      key: "branch",
      header: "BRANCH/YEAR",
      render: (r: Req) => (r.branch ? `${r.branch} (${r.year}Y)` : "N/A"),
    },
    { key: "github", header: "GITHUB", render: (r: Req) => r.githubUsername },
    {
      key: "status",
      header: "STATUS",
      render: (r: Req) => (
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
      render: (r: Req) => (
        <div className="flex justify-end gap-2">
          <TacticalButton
            variant="primary"
            size="sm"
            prefix=""
            disabled={isPending || r.status === "approved"}
            onClick={() => setStatus(r.id, "approved")}
          >
            APPROVE
          </TacticalButton>
          <TacticalButton
            variant="danger"
            size="sm"
            prefix=""
            disabled={isPending || r.status === "rejected"}
            onClick={() => setStatus(r.id, "rejected")}
          >
            REJECT
          </TacticalButton>
        </div>
      ),
    },
  ];

  return (
    <>
      <TacticalTable data={initialRequests} columns={columns} id="REQ_QUEUE" />
      <TacticalFeedback
        key={feedback?.message || "none"}
        message={feedback?.message || null}
        type={feedback?.type || "success"}
        onClear={() => setFeedback(null)}
      />
    </>
  );
}
