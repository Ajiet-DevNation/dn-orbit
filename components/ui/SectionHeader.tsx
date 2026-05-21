interface SectionHeaderProps {
  label: string;
  path?: string;
}

/**
 * SectionHeader — Section title with optional breadcrumb-style path.
 * Bebas Neue heading with a left vertical bar accent.
 * Path is displayed in IBM Plex Mono as muted text on the right.
 */
export function SectionHeader({ label, path }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-dashed border-border pb-3">
      <div className="flex items-center gap-3">
        <span className="h-6 w-1 bg-accent" />
        <h2 className="font-heading text-2xl uppercase tracking-wide text-white">
          {label}
        </h2>
      </div>
      {path && (
        <span className="font-mono text-[10px] uppercase text-text-muted">
          {path}
        </span>
      )}
    </div>
  );
}
