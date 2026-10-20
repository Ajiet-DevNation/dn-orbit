"use client";

import { useEffect, useRef } from "react";
import {
  COMET_LIFE_S,
  type Comet,
  makeStars,
  resizeStars,
  type Star,
  starAlpha,
  stepComet,
  stepStars,
} from "@/lib/starfield";
import { cn } from "@/lib/utils";

// Site background for every public page: black space with square pixel stars
// drifting left in three depths, a few twinkling, a rare pixel comet (logic in
// lib/starfield.ts). Fixed behind the content, never interactive.
//
// Cheap on purpose: one canvas, at most ~650 squares, redrawn at 30fps and
// only while the tab is visible. The global CSS motion reset can't touch a rAF
// loop, so reduced motion is handled here: one still frame, no loop.

const FPS = 30;
const FRAME_MS = 1000 / FPS;
/** A long pause (tab switch, debugger) must not teleport every star. */
const MAX_DT_S = 0.1;
const COMET_TRAIL = 5;

export function PixelStarfield({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rand = Math.random;
    let width = 0;
    let height = 0;
    let stars: Star[] = [];
    let comet: Comet | null = null;
    let t = 0;
    let raf = 0;
    let last = 0;

    const paint = () => {
      ctx.clearRect(0, 0, width, height);
      for (const s of stars) {
        const a = starAlpha(s, t);
        ctx.fillStyle = s.violet
          ? `rgba(167, 139, 250, ${a})`
          : `rgba(255, 255, 255, ${a})`;
        // Whole pixels keep the squares crisp; motion steps 1px at a time.
        ctx.fillRect(Math.round(s.x), Math.round(s.y), s.size, s.size);
      }
      if (comet) {
        const fade = 1 - comet.age / COMET_LIFE_S;
        for (let i = 0; i < COMET_TRAIL; i++) {
          ctx.fillStyle = `rgba(196, 181, 253, ${(0.55 - i * 0.11) * fade})`;
          ctx.fillRect(
            Math.round(comet.x - i * 8),
            Math.round(comet.y - i * 3.3),
            3,
            3,
          );
        }
      }
    };

    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = window.innerWidth;
      const h = window.innerHeight;
      stars =
        width === 0
          ? makeStars(w, h, rand)
          : resizeStars(
              stars,
              { width, height },
              { width: w, height: h },
              rand,
            );
      width = w;
      height = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      paint();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < FRAME_MS) return;
      const dt = Math.min(MAX_DT_S, (now - last) / 1000);
      last = now;
      t += dt;
      stepStars(stars, dt, width, height, rand);
      comet = stepComet(comet, dt, width, height, rand);
      paint();
    };

    const reduce = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const start = () => {
      if (raf || reduce || document.hidden) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    // Resize can fire many times a second while a window is dragged; refit
    // once per frame at most.
    let resizeRaf = 0;
    const onResize = () => {
      if (resizeRaf) return;
      resizeRaf = requestAnimationFrame(() => {
        resizeRaf = 0;
        fit();
      });
    };

    fit();
    start();
    window.addEventListener("resize", onResize, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      cancelAnimationFrame(resizeRaf);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none fixed inset-0", className)}
    />
  );
}
