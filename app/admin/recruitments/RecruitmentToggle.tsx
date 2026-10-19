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
    <section
      className={`flex flex-col gap-4 border-2 border-l-[6px] bg-black/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-between ${
        open
          ? "border-white/10 border-l-[#22c55e]"
          : "border-white/10 border-l-zinc-600"
      }`}
    >
      <div className="space-y-2">
        <div className="retro flex items-center gap-3 text-[10px] tracking-widest">
          <span className="text-zinc-500">RECRUITMENT</span>
          <span
            aria-hidden
            className={`size-2 ${open ? "animate-pulse bg-[#22c55e]" : "bg-zinc-600"}`}
          />
          <span className={open ? "text-[#22c55e]" : "text-zinc-400"}>
            {open ? "OPEN" : "CLOSED"}
          </span>
        </div>
        <p className="text-xs leading-relaxed text-zinc-400">
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
        className={`retro shrink-0 self-start border-2 px-4 py-2 text-[9px] transition-colors disabled:opacity-50 sm:self-auto ${
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
    </section>
  );
}
