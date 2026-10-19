import Link from "next/link";

// Thin "we're hiring" strip floated over the top of the hero. Rendered by the
// landing page only while an admin has recruitment switched on. Absolute so it
// doesn't push the full-height orbit down. It shares the top row with the
// sticky header (z-50), so it sits above it (z-60), sized to its content and
// centred on the logo row; the wrapper is click-through so the gaps beside it
// don't block the logo or avatar. On phones it drops below the header row.
export function RecruitmentBanner() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-[60] flex justify-center px-4 md:top-[37px]">
      <Link
        href="/recruitments"
        className="group pointer-events-auto inline-flex items-center gap-3.5 border-2 border-brand/35 bg-[#0a0a0a]/75 py-2.5 pr-4 pl-3.5 backdrop-blur-sm transition-[border-color,box-shadow] duration-200 hover:border-brand hover:shadow-[0_0_24px_rgba(139,92,246,0.25)] focus-visible:border-brand focus-visible:outline-none"
      >
        {/* Live dot: a solid pixel with a stepped ring pinging out of it. */}
        <span aria-hidden className="relative size-2 shrink-0 bg-brand">
          <span className="absolute -inset-1 animate-[recruit-ping_1.6s_steps(4,end)_infinite] border-2 border-brand" />
        </span>
        <span className="retro text-[8px] tracking-[0.28em] text-brand-light">
          RECRUITING
        </span>
        <span aria-hidden className="hidden h-3.5 w-px bg-white/15 xl:block" />
        <span className="hidden whitespace-nowrap font-mono text-xs text-white/65 xl:inline">
          Think you could be part of DevNation? We&apos;d love to have you.
        </span>
        <span aria-hidden className="h-3.5 w-px bg-white/15" />
        <span className="retro whitespace-nowrap text-[8px] text-white transition-colors duration-200 group-hover:text-brand-light">
          APPLY NOW{" "}
          <span className="inline-block transition-transform duration-200 ease-out group-hover:translate-x-[3px]">
            ▸
          </span>
        </span>
      </Link>
    </div>
  );
}
