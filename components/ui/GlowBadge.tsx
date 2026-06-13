import type { BadgeVariant } from "@/types";

interface GlowBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

/**
 * GlowBadge — Modern pill-shaped status badge with a subtle glow.
 */
export function GlowBadge({
  label,
  variant = "stable",
  className = "",
}: GlowBadgeProps) {
  
  // Mapping variants to modern gradient/glow classes instead of solid blocks
  const variantStyles: Record<string, string> = {
    stable: "border-[#22c55e]/50 bg-[#22c55e]/10 text-[#22c55e] shadow-[0_0_10px_rgba(34,197,94,0.2)]",
    experimental: "border-[#f97316]/50 bg-[#f97316]/10 text-[#f97316] shadow-[0_0_10px_rgba(249,115,22,0.2)]",
    archived: "border-[#888888]/50 bg-[#888888]/10 text-[#888888]",
    restricted: "border-[#eab308]/50 bg-[#eab308]/10 text-[#eab308] shadow-[0_0_10px_rgba(234,179,8,0.2)]",
    urgent: "border-[#ef4444]/50 bg-[#ef4444]/10 text-[#ef4444] shadow-[0_0_10px_rgba(239,68,68,0.2)]",
  };

  const style = variantStyles[variant] || variantStyles.stable;

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-body text-[10px] font-bold uppercase tracking-wider backdrop-blur-sm ${style} ${className}`}
    >
      {label}
    </span>
  );
}
