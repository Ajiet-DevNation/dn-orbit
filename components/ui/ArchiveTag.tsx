interface ArchiveTagProps {
  label: string;
  className?: string;
}

/**
 * ArchiveTag — Small entry tag displayed above hero titles.
 * Think of it like a classified-document stamp ID at the top of a page.
 * Always uppercase, dashed border, IBM Plex Mono.
 */
export function ArchiveTag({ label, className = "" }: ArchiveTagProps) {
  return (
    <span
      className={`inline-block border border-dashed border-border px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-text-muted ${className}`}
    >
      {label}
    </span>
  );
}
