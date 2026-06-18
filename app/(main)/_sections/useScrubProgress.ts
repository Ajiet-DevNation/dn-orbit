"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Scroll-scrubbed progress ────────────────────────────────────────────────
// Returns an eased 0→1 value that tracks how far a tall, pinned section has been
// scrolled through. The same mechanism that drives AboutTerminal, generalised so
// the leaderboard podium and the project / member carousels can all key their
// animations to scroll position.
//
// Why hand-rolled rAF (and not CSS / framer-motion): the site flattens all CSS
// `animation`/`transition` durations under `prefers-reduced-motion` (see
// globals.css). Because progress here is a pure function of scroll offset and the
// easing runs in JS setting values React renders, the animation is unaffected by
// that reset — motion stays bound to the user's own scrolling, which is the
// accessible behaviour (no autonomous motion to suppress).
//
// Scroll events arrive in coarse jumps (a wheel notch can be a big delta), so
// scroll only sets a *target*; a rAF loop eases the displayed value toward it
// with a frame-rate-independent exponential approach, so a dropped frame never
// produces a visible jump. The loop self-stops once it catches up.

interface ScrubOptions {
  /** Fraction of the scrub region to skip before progress leaves 0. */
  start?: number;
  /** Fraction of the scrub region at which progress reaches 1. */
  end?: number;
  /** Smoothing time-constant in ms. Lower = snappier, higher = floatier. */
  tau?: number;
  /**
   * Entry lead-in, as a fraction of the viewport height. With `lead = 0`,
   * progress only leaves 0 once the section is fully pinned (its top hits the
   * viewport top). A positive lead starts the scrub *while the section is still
   * rising into view* — progress hits 0 when the section's top is `lead × 100%`
   * of the way down the viewport — so the animation is already underway by the
   * time it pins, instead of sitting empty until then.
   */
  lead?: number;
}

function clamp01(n: number): number {
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

// Quantise to cut redundant re-renders: sub-0.001 changes aren't visible.
function quantise(n: number): number {
  return Math.round(n * 1000) / 1000;
}

const MAX_DT_MS = 50; // clamp dt so returning from an idle tab can't leap

export function useScrubProgress(
  ref: React.RefObject<HTMLElement | null>,
  { start = 0, end = 1, tau = 90, lead = 0 }: ScrubOptions = {}
): number {
  const [progress, setProgress] = useState(0);

  const targetRef = useRef(0);
  const displayedRef = useRef(0);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  const wake = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = now;

      const diff = targetRef.current - displayedRef.current;
      if (Math.abs(diff) < 0.0005) {
        displayedRef.current = targetRef.current;
        runningRef.current = false;
        const next = quantise(displayedRef.current);
        setProgress((p) => (p === next ? p : next));
        return;
      }

      displayedRef.current += diff * (1 - Math.exp(-dt / tau));
      const next = quantise(displayedRef.current);
      setProgress((p) => (p === next ? p : next));
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [tau]);

  useEffect(() => {
    let frame = 0;

    const update = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const scrubDistance = rect.height - window.innerHeight;
      // Entry lead-in distance (px). When > 0 the scrub starts before the pin:
      // raw = 0 when rect.top === leadPx (section top `lead` of the way down the
      // viewport), passes lead/total at the pin (rect.top === 0), and reaches 1
      // at the end of travel (rect.top === -scrubDistance).
      const leadPx = lead * window.innerHeight;
      const total = scrubDistance + leadPx;
      const raw =
        total > 0 ? (leadPx - rect.top) / total : rect.top <= 0 ? 1 : 0;
      targetRef.current = clamp01((raw - start) / (end - start));
      wake();
    };

    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ref, start, end, lead, wake]);

  return progress;
}
