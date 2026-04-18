import type { ReactNode } from "react";

interface PolaroidCardProps {
  title: string;
  author: string;
  date: string;
  image: string;
  children?: ReactNode;
}

/**
 * PolaroidCard — White-bordered Polaroid-style project card.
 * The thick white border creates the physical photo effect.
 * Children slot is for StampLabel overlays.
 */
export function PolaroidCard({
  title,
  author,
  date,
  image,
  children,
}: PolaroidCardProps) {
  return (
    <div className="relative border-[6px] border-white bg-surface">
      {/* Image region */}
      <div className="relative aspect-square overflow-hidden bg-surface-2">
        <img
          src={image}
          alt={title}
          className="h-full w-full object-cover"
        />
        {/* Stamp overlays */}
        {children}
      </div>

      {/* Metadata strip — thicker bottom like a real Polaroid */}
      <div className="border-t border-dashed border-border bg-black px-3 py-3">
        <p className="font-heading text-base uppercase tracking-wide text-white">
          {title}
        </p>
        <div className="mt-1 flex items-center justify-between font-mono text-[10px] uppercase text-text-muted">
          <span>AUTH: {author}</span>
          <span>{date}</span>
        </div>
      </div>
    </div>
  );
}
