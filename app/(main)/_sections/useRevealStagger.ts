"use client";

import { useEffect, useRef, useState } from "react";

// ─── Staggered reveal-on-enter ───────────────────────────────────────────────
// When the container scrolls into view, each item's 0→1 reveal value tweens in,
// staggered by index, producing a wave of pop-ins. The reveal fires once and
// stays revealed (it does not reverse on scroll-up), which reads better for a
// static grid than a continuously scroll-linked value.
//
// Unlike the scroll-scrubbed sections, this is a time-based animation, so it
// genuinely honours `prefers-reduced-motion`: when reduced motion is requested
// every item snaps straight to its final state with no tween.

interface RevealOptions {
  /** Delay between consecutive items, in ms. */
  stagger?: number;
  /** Per-item tween duration, in ms. */
  duration?: number;
  /** 0–1 of the viewport height the top must cross before firing. */
  threshold?: number;
}

// easeOutBack — a slight overshoot gives the pop a springy, arcade feel.
function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function useRevealStagger(
  count: number,
  { stagger = 90, duration = 520, threshold = 0.15 }: RevealOptions = {}
): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  reveal: number[];
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const [reveal, setReveal] = useState<number[]>(() =>
    Array.from({ length: count }, () => 0)
  );

  useEffect(() => {
    // On (re)mount or when the item count changes, re-observe and replay. Until
    // the tween writes a full-length array, consumers read missing indices as 0
    // via their own `?? 0` fallback, so no synchronous reset is needed here.
    const el = containerRef.current;
    if (!el || count === 0) return;

    let raf = 0;
    let startTime = 0;
    let fired = false;

    const finish = () => setReveal(Array.from({ length: count }, () => 1));

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const next = Array.from({ length: count }, (_, i) =>
        easeOutBack(Math.min(1, Math.max(0, (elapsed - i * stagger) / duration)))
      );
      setReveal(next);
      const lastDone = (count - 1) * stagger + duration;
      if (elapsed < lastDone) {
        raf = requestAnimationFrame(tick);
      } else {
        finish();
      }
    };

    const fire = () => {
      if (fired) return;
      fired = true;
      if (prefersReducedMotion()) {
        finish();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fire();
          io.disconnect();
        }
      },
      { threshold }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, stagger, duration, threshold]);

  return { containerRef, reveal };
}
