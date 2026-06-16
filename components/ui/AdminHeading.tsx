import { cn } from "@/lib/utils";

// Consistent 8-bit page heading for the admin panel: a pixel-font title with a
// green underline block and an optional status / hex sub-row — mirrors the
// public SectionHeading treatment so admin and site read as one design system.
interface AdminHeadingProps {
  title: string;
  /** Small status label shown under the title (e.g. "ORBIT_COMMAND_SYSTEM_READY"). */
  sub?: string;
  /** Optional monospace code shown at the far right of the sub-row. */
  code?: string;
  className?: string;
}

export function AdminHeading({ title, sub, code, className }: AdminHeadingProps) {
  return (
    <header className={cn("border-b-2 border-white/10 pb-8", className)}>
      <div className="flex flex-col gap-5">
        <h1 className="retro text-xl md:text-2xl uppercase tracking-wider text-white leading-relaxed select-none">
          {title}
        </h1>
        <span aria-hidden="true" className="block h-[5px] w-28 bg-[#22c55e]" />
        {(sub || code) && (
          <div className="flex items-center gap-4">
            {sub && (
              <span className="retro text-[8px] text-[#22c55e]/60 tracking-[0.3em] uppercase">
                {sub}
              </span>
            )}
            <div className="h-px flex-1 bg-white/10" />
            {code && (
              <span className="retro text-[8px] text-zinc-700 tracking-widest">{code}</span>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
