"use client";

import { type RefObject, useEffect } from "react";
import { framePosition } from "@/lib/sprite";

/**
 * Steps a sprite-sheet div's backgroundPosition on rAF. `frameAt(t)` maps
 * elapsed ms to a frame index (see lib/sprite.ts). Pass `active = false` to
 * hold frame 0.
 *
 * rAF, not CSS steps(): globals.css flattens CSS animation under
 * prefers-reduced-motion, so that path is explicit here — frame 0, no loop.
 */
export function useSpriteSheet(
  ref: RefObject<HTMLElement | null>,
  frames: number,
  frameAt: (t: number) => number,
  active = true,
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.backgroundPosition = framePosition(0, frames);
    if (
      !active ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    )
      return;

    const start = performance.now();
    let raf = 0;
    let shown = 0;
    const tick = (now: number) => {
      // Style write only when the frame actually changes (a few times a
      // second), not on all 60+ frames.
      const frame = frameAt(now - start);
      if (frame !== shown) {
        el.style.backgroundPosition = framePosition(frame, frames);
        shown = frame;
      }
      raf = requestAnimationFrame(tick);
    };
    // Only animate while on screen.
    const io = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !raf) raf = requestAnimationFrame(tick);
      if (!entry.isIntersecting && raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [ref, frames, frameAt, active]);
}
