"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLinkProps {
  /** Extra classes on the link wrapper. */
  className?: string;
  /** Classes for the logo image (sizing, drop-shadow). */
  imageClassName?: string;
  /** Classes for the ORBIT wordmark (sizing, responsive visibility). */
  wordmarkClassName?: string;
  /** Fired on click in addition to navigation (e.g. scroll-to-top on landing). */
  onClick?: () => void;
  /** Preload + eager-load the logo. Only the above-the-fold header should set
   * this; the footer logo stays lazy so it isn't preloaded off-screen. */
  priority?: boolean;
}

// The ORBIT brand lockup (DN mark + wordmark) as a single link home, shared by
// the header and footer.
export function BrandLink({
  className,
  imageClassName,
  wordmarkClassName,
  onClick,
  priority = false,
}: BrandLinkProps) {
  return (
    <Link
      href="/"
      aria-label="ORBIT — home"
      onClick={onClick}
      className={cn(
        "inline-flex w-fit items-center gap-0 transition-opacity duration-200 hover:opacity-80",
        className
      )}
    >
      <Image
        src="/assets/DNLogoTransparent.png"
        alt="DevNation"
        width={64}
        height={64}
        priority={priority}
        loading={priority ? "eager" : "lazy"}
        className={cn("pixelated opacity-90", imageClassName)}
      />
      <span
        className={cn(
          "font-[family-name:var(--font-pixel)] leading-none text-white",
          wordmarkClassName
        )}
      >
        ORBIT
      </span>
    </Link>
  );
}
