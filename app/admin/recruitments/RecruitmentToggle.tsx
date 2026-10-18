"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "@/components/ui/8bit-toast";

// The admin switch behind the landing-page banner and the /recruitments form.
export function RecruitmentToggle({ initialOpen }: { initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const toggle = () =>
    startTransition(async () => {
      const next = !open;
      try {
        const res = await fetch("/api/admin/recruitments", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isOpen: next }),
        });
        if (!res.ok) throw new Error(await res.text());
        setOpen(next);
        router.refresh();
        toast.success(next ? "Recruitment opened" : "Recruitment closed");
      } catch (err) {
        toast.error(
          `Update failed: ${err instanceof Error ? err.message : "unknown"}`,
        );
      }
    });

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-5">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              open
                ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]"
                : "bg-zinc-600"
            }`}
          />
          <span
            className={`retro text-[10px] ${open ? "text-[#22c55e]" : "text-zinc-500"}`}
          >
            {open ? "OPEN" : "CLOSED"}
          </span>
        </div>
        <p className="text-[10px] leading-relaxed text-zinc-500">
          {open
            ? "The landing page shows the RECRUITING banner and /recruitments accepts applications."
            : "No banner on the landing page. /recruitments shows a closed notice."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={open}
        disabled={isPending}
        onClick={toggle}
        className={`retro border-2 px-4 py-2 text-[9px] transition-colors disabled:opacity-50 ${
          open
            ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
            : "border-[#22c55e] text-[#22c55e] hover:bg-[#22c55e] hover:text-black"
        }`}
      >
        {isPending
          ? "SAVING…"
          : open
            ? "CLOSE RECRUITMENT"
            : "OPEN RECRUITMENT"}
      </button>
    </div>
  );
}
