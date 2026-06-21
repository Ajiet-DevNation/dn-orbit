"use client";

import { useEffect, useRef, useState } from "react";
import { PixelLoadingScreen } from "./PixelLoadingScreen";

// Client boot-splash that guarantees the pixel DN-logo draw plays on every full
// page load, independent of Next's Suspense/streaming timing.
//
// Why this exists: the route-level `app/loading.tsx` is a Suspense fallback, and
// a fallback can't paint until its (data-awaiting) parent layout renders, then is
// torn down the instant the page resolves — so on a fast resolve the logo never
// gets to draw and the user sees a blank frame. Rendered inside the layout, this
// overlay is part of the streamed shell (so it paints immediately) and stays up
// for a guaranteed minimum so the draw always completes, then fades out via a
// JS-driven tween (immune to the global prefers-reduced-motion CSS reset).
//
// It lives in the persistent (main) layout, so it mounts once per FULL load and
// does NOT replay on in-app (soft) navigations.

const MIN_VISIBLE_MS = 2200; // long enough for the pixel draw to finish
const EXIT_MS = 720;

// Smooth, eased ramp (no overshoot) for the exit so it reads as a deliberate
// "settle into the app" rather than a flat linear dim.
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function BootSplash() {
  const [removed, setRemoved] = useState(false);
  const [interactive, setInteractive] = useState(true);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const start = performance.now();
    let raf = 0;
    let fadeStarted = false;

    const dismiss = () => {
      if (fadeStarted) return;
      fadeStarted = true;
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - start));
      window.setTimeout(() => {
        setInteractive(false);
        if (reduce) {
          setRemoved(true);
          return;
        }
        const el = overlayRef.current;
        if (el) el.style.willChange = "opacity, filter, transform";
        const t0 = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - t0) / EXIT_MS);
          const e = easeInOutCubic(p);
          if (el) {
            // Defocus + a gentle push-through reveal: the splash softens and
            // recedes as the (identically-sized) landing logo resolves beneath
            // it — a continuous hand-off instead of a hard cross-fade.
            el.style.opacity = String(1 - e);
            el.style.filter = `blur(${e * 10}px)`;
            el.style.transform = `scale(${1 + e * 0.04})`;
          }
          if (p < 1) raf = requestAnimationFrame(tick);
          else setRemoved(true);
        };
        raf = requestAnimationFrame(tick);
      }, wait);
    };

    if (document.readyState === "complete") dismiss();
    else window.addEventListener("load", dismiss, { once: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("load", dismiss);
    };
  }, []);

  if (removed) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200]"
      style={{ pointerEvents: interactive ? "auto" : "none" }}
    >
      <PixelLoadingScreen />
    </div>
  );
}
