"use client";

import { type ReactNode, useEffect, useRef } from "react";

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Vertical travel in px for the fade-up. */
  y?: number;
  /** Delay before the reveal starts, in seconds. */
  delay?: number;
}

/**
 * Subtle, once-only fade-up as the element scrolls into view. Honours
 * prefers-reduced-motion (renders static). Web Animations API, so no animation
 * library ships for one entrance.
 */
export function Reveal({
  children,
  className,
  y = 24,
  delay = 0,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";
    let anim: Animation | null = null;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        io.disconnect();
        anim = el.animate(
          [
            { opacity: 0, transform: `translateY(${y}px)` },
            { opacity: 1, transform: "translateY(0)" },
          ],
          {
            duration: 600,
            delay: delay * 1000,
            easing: "cubic-bezier(0.16, 1, 0.3, 1)",
            fill: "backwards",
          },
        );
        el.style.opacity = "";
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      anim?.cancel();
      el.style.opacity = "";
    };
  }, [y, delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
