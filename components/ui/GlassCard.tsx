import type { ReactNode } from "react";
import Image from "next/image";

interface GlassCardProps {
  title: string;
  author: string;
  date: string;
  image: string;
  children?: ReactNode;
}

/**
 * GlassCard — Modern glassmorphic project card.
 * Features a subtle blur background and 3D hover transition.
 */
export function GlassCard({
  title,
  author,
  date,
  image,
  children,
}: GlassCardProps) {
  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl flex flex-col h-full">
      {/* Image region */}
      <div className="relative aspect-video w-full overflow-hidden bg-surface-3">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#202021]/80 to-transparent" />
        {/* Stamp overlays */}
        {children}
      </div>

      {/* Metadata strip */}
      <div className="relative flex flex-col justify-end p-5 flex-grow">
        <p className="font-heading text-xl font-bold tracking-tight text-white group-hover:text-accent transition-colors">
          {title}
        </p>
        <div className="mt-3 flex items-center justify-between font-body text-[11px] font-medium uppercase text-text-muted">
          <span className="flex items-center gap-1.5">
            <span className="h-4 w-4 rounded-full bg-surface-3 border border-border"></span>
            {author}
          </span>
          <span className="text-accent">{date}</span>
        </div>
      </div>
    </div>
  );
}
