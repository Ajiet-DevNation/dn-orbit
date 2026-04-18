import type { StampVariant } from "@/types";

interface StampLabelProps {
  label: string;
  variant?: StampVariant;
  rotate?: number;
  className?: string;
}

/**
 * StampLabel — Absolutely positioned rotated stamp overlay.
 * Used on cards and sections to add a classified-document feel.
 * Variant controls the color (matches CSS classes in globals.css).
 */
export function StampLabel({
  label,
  variant = "verified",
  rotate = -6,
  className = "",
}: StampLabelProps) {
  return (
    <span
      className={`stamp-${variant} absolute border-2 border-dashed px-3 py-1 font-heading text-sm uppercase tracking-widest ${className}`}
      style={{ transform: `rotate(${rotate}deg)` }}
    >
      {label}
    </span>
  );
}
