import Link from "next/link";

// Thin "we're hiring" strip floated over the top of the hero. Rendered by the
// landing page only while an admin has recruitment switched on. Absolute so it
// doesn't push the full-height orbit down; the header is hidden at the top of
// the landing page, so nothing else lives here.
export function RecruitmentBanner() {
  return (
    <div className="absolute inset-x-0 top-4 z-40 px-4 sm:top-6 sm:px-10">
      <Link
        href="/recruitments"
        className="group mx-auto flex max-w-5xl items-center justify-center gap-3 border-2 border-[#22c55e]/30 bg-black/70 px-4 py-3 backdrop-blur-sm transition-colors hover:border-[#22c55e]/70 sm:gap-5"
      >
        <span className="retro text-[8px] tracking-[0.3em] text-[#22c55e] sm:text-[9px]">
          RECRUITING
        </span>
        <span aria-hidden className="h-4 w-px bg-white/20" />
        <span className="hidden font-mono text-xs text-white/70 sm:inline">
          Think you could be part of DevNation? We&apos;d love to have you.
        </span>
        <span className="retro border-b-2 border-[#22c55e] pb-0.5 text-[8px] text-white transition-colors group-hover:text-[#22c55e] sm:text-[9px]">
          APPLY NOW ▸
        </span>
      </Link>
    </div>
  );
}
