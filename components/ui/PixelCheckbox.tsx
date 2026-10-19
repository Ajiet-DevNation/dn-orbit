"use client";

import { cn } from "@/lib/utils";

// 8-bit checkbox: a square pixel frame that fills solid purple when checked —
// replaces the browser-native checkbox so toggles stay on-theme. Keyboard- and
// screen-reader-accessible via role="checkbox" + aria-checked.
export function PixelCheckbox({
  checked,
  onChange,
  className,
  "aria-label": ariaLabel,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  className?: string;
  "aria-label"?: string;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      className={cn(
        "flex size-5 shrink-0 cursor-pointer items-center justify-center border-2 bg-black transition-colors",
        checked ? "border-brand" : "border-white/30 hover:border-brand/60",
        className,
      )}
    >
      {checked && <span className="block size-2.5 bg-brand" />}
    </button>
  );
}
