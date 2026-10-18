import Link from "next/link";

// Thin "we're hiring" strip floated over the top of the hero. Rendered by the
// landing page only while an admin has recruitment switched on. Absolute so it
// doesn't push the full-height orbit down. It shares the top row with the
// sticky header (z-50), so it sits above it (z-60) and leaves side gaps for the
// logo and avatar; the wrapper is click-through so those gaps don't block them.
// On phones there's no room beside the logo, so it drops below the header row.
export function RecruitmentBanner() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-[60] px-4 md:top-7 md:px-64">
      <Link
        href="/recruitments"
        className="group pointer-events-auto mx-auto flex max-w-5xl items-center justify-center gap-3 border-2 border-[#22c55e]/30 bg-black/70 px-4 py-3 backdrop-blur-sm transition-colors hover:border-[#22c55e]/70 sm:gap-5"
      >
        <span className="retro text-[8px] tracking-[0.3em] text-[#22c55e] sm:text-[9px]">
          RECRUITING
        </span>
        <span aria-hidden className="h-4 w-px bg-white/20" />
        <span className="hidden font-mono text-xs text-white/70 xl:inline">
          Think you could be part of DevNation? We&apos;d love to have you.
        </span>
        <span className="retro border-b-2 border-[#22c55e] pb-0.5 text-[8px] text-white transition-colors group-hover:text-[#22c55e] sm:text-[9px]">
          APPLY NOW ▸
        </span>
      </Link>
    </div>
  );
}
