"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Vertical travel in px for the fade-up. */
  y?: number;
  /** Delay before the reveal starts, in seconds. */
  delay?: number;
}

/**
 * Subtle, once-only fade-up as the element scrolls into view. Keeps the 8-bit
 * theme — this only eases entrances, it doesn't add any decorative motion.
 *
 * A CSS transition on an IntersectionObserver flag rather than framer-motion,
 * which this one fade was the only user of. Under prefers-reduced-motion the
 * globals.css reset flattens the transition, so it simply appears.
 */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setShown(true);
        io.disconnect();
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-[opacity,translate] duration-500 ease-(--ease-out-quart)",
        className,
      )}
      style={{
        opacity: shown ? 1 : 0,
        translate: shown ? "0 0" : `0 ${y}px`,
        transitionDelay: `${delay}s`,
      }}
    >
      {children}
    </div>
  );
}
