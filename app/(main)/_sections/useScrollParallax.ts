"use client";

import { useEffect } from "react";
import { viewportProgress } from "@/lib/parallax";

// Non-blocking horizontal drift keyed to scroll position. Writes a translateX
// straight to `stageRef` (imperative — no per-frame React renders, matching
// useCoverflow). Disabled under prefers-reduced-motion (the global CSS reset
// flattens CSS motion; this JS motion is autonomous-ish, so we suppress it).
//
// Smoothness: the loop samples the scroll position EVERY animation frame while
// the section is on screen — not once per scroll event — so coarse wheel /
// trackpad notches can't produce a stepped, slide-show look. It eases toward the
// freshly-sampled target each frame, so motion stays continuous at the display's
// refresh rate.
//
// Efficiency: an IntersectionObserver only runs the loop while the section is in
// view, and the loop pauses itself once motion has settled AND scrolling has
// stopped; a passive scroll/resize listener kicks it back to life. Nothing runs
// when idle or off-screen.
//
//   maxPx     peak drift each way (total travel = 2 × maxPx across the section).
//   direction +1 → drifts right while scrolling down; -1 → drifts left.
//   tau       easing time-constant (ms): higher = floatier, lower = snappier.

const MAX_DT_MS = 50; // clamp dt so returning from an idle tab can't leap
const SETTLED = 0.0002;

interface ParallaxOptions {
  maxPx?: number;
  direction?: number;
  tau?: number;
}

export function useScrollParallax(
  sectionRef: React.RefObject<HTMLElement | null>,
  stageRef: React.RefObject<HTMLElement | null>,
  { maxPx = 120, direction = 1, tau = 150 }: ParallaxOptions = {}
): void {
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    // Capture the node once: stable for this mount, and lets the cleanup avoid
    // reading a ref that lint warns may have changed by teardown.
    const stage = stageRef.current;

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (stage) {
        stage.style.transform = "";
        stage.style.willChange = "";
      }
      return;
    }

    let displayed = 0;
    let raf = 0;
    let last = 0;
    let visible = false;
    let lastScrollY = Number.NaN;

    const frame = (now: number) => {
      const dt = Math.min(now - last, MAX_DT_MS);
      last = now;

      const rect = section.getBoundingClientRect();
      const target =
        direction * viewportProgress(rect.top, rect.height, window.innerHeight);

      // Frame-rate-independent exponential ease toward the per-frame target.
      displayed += (target - displayed) * (1 - Math.exp(-dt / tau));

      const el = stage;
      if (el) el.style.transform = `translate3d(${displayed * maxPx}px,0,0)`;

      const scrollY = window.scrollY;
      const settled = Math.abs(target - displayed) < SETTLED;
      const sameScroll = scrollY === lastScrollY;
      lastScrollY = scrollY;

      // Pause when there's nothing left to animate and the user isn't scrolling,
      // and demote the layer so it isn't held on the GPU while idle.
      if (settled && sameScroll) {
        raf = 0;
        if (el) el.style.willChange = "";
        return;
      }
      raf = requestAnimationFrame(frame);
    };

    const kick = () => {
      if (raf || !visible) return;
      last = performance.now();
      lastScrollY = Number.NaN; // force at least one more evaluated frame
      // Promote only while actively drifting.
      if (stage) stage.style.willChange = "transform";
      raf = requestAnimationFrame(frame);
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) kick();
        else stop();
      },
      { threshold: 0 }
    );
    io.observe(section);

    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick, { passive: true });
    return () => {
      stop();
      io.disconnect();
      if (stage) stage.style.willChange = "";
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
    };
  }, [sectionRef, stageRef, maxPx, direction, tau]);
}
