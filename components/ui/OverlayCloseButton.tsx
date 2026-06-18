"use client";

import { cn } from "@/lib/utils";

// The single, canonical close control for full-screen detail overlays (events,
// projects, …). A clear pixel-bordered "✕ CLOSE" button — consistent everywhere
// — meant to be positioned at the top-right of the overlay's centred content
// (not the viewport edge) so it stays within reach and clear of the header.
export function OverlayCloseButton({
  onClick,
  className,
  label = "Close",
}: {
  onClick: () => void;
  className?: string;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        "retro z-10 flex cursor-pointer items-center gap-2 border-2 border-[#22c55e] bg-[#0a0a0a] px-3 py-2 text-[10px] text-[#22c55e] shadow-[0_0_12px_rgba(34,197,94,0.25)] transition-colors duration-200 hover:bg-[#22c55e] hover:text-[#0a0a0a]",
        className
      )}
    >
      <span aria-hidden>✕</span> CLOSE
    </button>
  );
}
