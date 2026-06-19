"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/8bit-button";

// The single, canonical close control for full-screen detail overlays (events,
// projects, …). A chunky 8-bit pixel button. Callers pin it to the viewport's
// top-right (fixed) so it's always in the same place and within reach, no matter
// the viewport width or how far the overlay content is scrolled.
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
    <Button
      type="button"
      size="sm"
      onClick={onClick}
      aria-label={label}
      className={cn("text-[10px]", className)}
    >
      <span aria-hidden>✕</span> CLOSE
    </Button>
  );
}
