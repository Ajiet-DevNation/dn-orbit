"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "@/components/ui/8bit-toast";
import { errorMessage } from "@/lib/utils";

interface SyncSummary {
  created: number;
  updated: number;
  reopened: number;
  skipped: number;
}

// Admin trigger for the GitHub org → pending-projects sync. Kept as its own
// client component so the projects page itself stays a Server Component.
export function SyncGithubButton() {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const sync = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/admin/projects/sync-github", {
          method: "POST",
        });
        if (!res.ok) throw new Error(await errorMessage(res));
        const s = (await res.json()) as SyncSummary;
        router.refresh();
        toast.success(
          `SYNC_COMPLETE: ${s.created} NEW · ${s.updated} UPDATED · ${s.reopened} REOPENED · ${s.skipped} SKIPPED`,
        );
      } catch (err) {
        toast.error(
          `SYNC_FAILURE: ${err instanceof Error ? err.message : "UNKNOWN"}`,
        );
      }
    });
  };

  return (
    <button
      type="button"
      onClick={sync}
      disabled={isPending}
      className="retro border-2 border-[#22c55e] px-3 py-1.5 text-[8px] text-[#22c55e] transition-colors hover:bg-[#22c55e] hover:text-black disabled:opacity-50"
    >
      {isPending ? "SYNCING…" : "SYNC FROM GITHUB"}
    </button>
  );
}
