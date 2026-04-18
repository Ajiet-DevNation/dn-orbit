import type { BadgeVariant } from "@/types";

interface ArchiveBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * ArchiveBadge — Small inline status badge.
 * Uses CSS classes from globals.css for variant-specific backgrounds.
 * Always uppercase IBM Plex Mono.
 */
export function ArchiveBadge({
  label,
  variant = "stable",
  className = "",
}: ArchiveBadgeProps) {
  return (
    <span
      className={`badge-${variant} inline-block px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${className}`}
    >
      {label}
    </span>
  );
}
