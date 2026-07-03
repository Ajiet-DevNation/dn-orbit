export function PixelPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-6 border-b-2 border-white/10 pb-8 md:flex-row md:items-end md:justify-between">
      <div className="flex flex-col gap-2">
        <h1 className="retro text-2xl uppercase tracking-wider text-white">
          {title}
        </h1>
        {subtitle && (
          <p className="retro text-[8px] tracking-[0.3em] text-zinc-600">
            {subtitle}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-end gap-3">{actions}</div>
      )}
    </header>
  );
}
