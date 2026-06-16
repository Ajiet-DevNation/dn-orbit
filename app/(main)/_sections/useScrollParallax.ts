"use client";

import { useEffect } from "react";
import { viewportProgress } from "@/lib/parallax";

// Subtle, non-blocking horizontal drift keyed to scroll position. Writes a
// translateX straight to `stageRef` (imperative — no per-frame React renders,
// matching useCoverflow). Eased in a self-stopping rAF loop so coarse wheel
// deltas don't jump. Disabled under prefers-reduced-motion (the global CSS reset
// flattens CSS motion; this JS motion is autonomous-ish, so we suppress it).

const TAU_MS = 120;
const MAX_DT_MS = 50;

export function useScrollParallax(
  sectionRef: React.RefObject<HTMLElement | null>,
  stageRef: React.RefObject<HTMLElement | null>,
  maxPx = 40
): void {
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (stageRef.current) stageRef.current.style.transform = "";
      return;
    }

    let target = 0;
    let displayed = 0;
    let running = false;
    let raf = 0;
    let last = 0;
    let scrollFrame = 0;

    const apply = () => {
      const el = stageRef.current;
      if (el) el.style.transform = `translate3d(${displayed * maxPx}px,0,0)`;
    };

    const wake = () => {
      if (running) return;
      running = true;
      last = performance.now();
      const step = (now: number) => {
        const dt = Math.min(now - last, MAX_DT_MS);
        last = now;
        const diff = target - displayed;
        if (Math.abs(diff) < 0.0005) {
          displayed = target;
          apply();
          running = false;
          return;
        }
        displayed += diff * (1 - Math.exp(-dt / TAU_MS));
        apply();
        raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    };

    const measure = () => {
      scrollFrame = 0;
      const el = sectionRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Negate so the stage drifts the opposite way to scroll travel (reads as
      // depth). Range -1..1 → translateX -maxPx..maxPx.
      target = -viewportProgress(rect.top, rect.height, window.innerHeight);
      wake();
    };

    const onScroll = () => {
      if (scrollFrame) return;
      scrollFrame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (scrollFrame) cancelAnimationFrame(scrollFrame);
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [sectionRef, stageRef, maxPx]);
}
