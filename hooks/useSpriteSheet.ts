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
    const tick = (now: number) => {
      el.style.backgroundPosition = framePosition(frameAt(now - start), frames);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref, frames, frameAt, active]);
}
