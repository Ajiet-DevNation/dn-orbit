// The single page header for every /admin surface.
//
// The panel previously carried two headers that looked different but did the
// same job — this one, and `AdminHeading` (green accent bar + a right-aligned
// counter). Approvals and Requests used the latter, seven pages used this one,
// and "new event" hand-rolled a third. They are merged here: the accent bar and
// the `code` slot come from AdminHeading, the `actions` slot from the original,
// so no page lost a capability in the consolidation.
export function PixelPageHeader({
  title,
  subtitle,
  code,
  actions,
}: {
  title: string;
  /** Small caps label under the title, e.g. "SYSTEM OVERVIEW". */
  subtitle?: string;
  /** Right-aligned status readout, e.g. "4 PENDING". */
  code?: string;
  /** Buttons/links rendered at the end of the header row. */
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b-2 border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex min-w-0 flex-col gap-4">
        <h1 className="retro text-xl leading-relaxed tracking-wider text-white uppercase select-none md:text-2xl">
          {title}
        </h1>
        <span aria-hidden="true" className="block h-[5px] w-28 bg-[#22c55e]" />
        {(subtitle || code) && (
          <div className="flex items-center gap-4">
            {subtitle && (
              <span className="retro text-[8px] tracking-[0.3em] text-[#22c55e]/60 uppercase">
                {subtitle}
              </span>
            )}
            <div className="h-px flex-1 bg-white/10" />
            {code && (
              <span className="retro shrink-0 text-[8px] tracking-widest text-zinc-600">
                {code}
              </span>
            )}
          </div>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-end gap-3">{actions}</div>
      )}
    </header>
  );
}
