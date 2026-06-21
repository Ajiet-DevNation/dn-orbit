"use client";

import { useEffect, useRef } from "react";

// Sci-fi pixel scanner for the centred coverflow card, drawn on a SINGLE canvas
// (not hundreds of DOM cells) so it stays cheap on low-end devices: one
// GPU-composited element, and per-frame we only touch the thin ring of cells the
// wave is currently passing through.
//
// The effect: a ring expands from the centre outward. At its leading edge the
// pixel blocks flare to a bright mint "shine"; behind the edge they settle into a
// translucent, per-cell-varied green (the glassy field the photo shows through);
// behind THAT a trailing edge clears them back to nothing — so the net read is a
// bright scan-ring sweeping out and dissolving the green as it goes, with a soft
// green glow riding the ring. Mounted only on the active card and keyed by
// activeIndex (consumer), so it plays once per card and leaves zero idle nodes.
// Self-drives on rAF (so it survives the global reduced-motion CSS reset) and
// no-ops entirely under reduced motion — the user just sees the clean image.

const CELL_PX = 14; // on-screen size of a scan block — small, crisp pixels
const DURATION = 720; // ms for the whole sweep + dissolve
const MAX_DPR = 2; // cap backing resolution (transient effect — chunky anyway)
const EDGE = 0.16; // width of the bright leading "shine" band (normalised dist)

// Deterministic per-cell noise (0..1) for shade/translucency variety.
function hash(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

export function PixelScanOverlay() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement;
    if (!canvas || !parent) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const rect = parent.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);
    if (w === 0 || h === 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const cols = Math.max(6, Math.round(w / CELL_PX));
    const rows = Math.max(6, Math.round(h / CELL_PX));
    const cw = w / cols;
    const ch = h / rows;
    const cx = (cols - 1) / 2;
    const cy = (rows - 1) / 2;
    const maxDist = Math.hypot(cx, cy) || 1;
    const cornerPx = Math.hypot(w / 2, h / 2);

    let raf = 0;
    let start = 0;

    const draw = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / DURATION, 1);
      ctx.clearRect(0, 0, w, h);

      // Fill front races out; clear front trails it — the gap between them is the
      // lit scan band. Both eased so the ring decelerates as it reaches the edge.
      const ease = (x: number) => 1 - Math.pow(1 - x, 2);
      const fillFront = ease(Math.min(p / 0.6, 1)); // 0..1 over first 60%
      const clearFront = p <= 0.34 ? 0 : ease((p - 0.34) / 0.66);

      ctx.globalCompositeOperation = "source-over";
      for (let gy = 0; gy < rows; gy++) {
        for (let gx = 0; gx < cols; gx++) {
          const d = Math.hypot(gx - cx, gy - cy) / maxDist; // 0 centre → 1 corner
          if (d > fillFront || d <= clearFront) continue; // ahead, or cleared

          const edge = Math.max(0, 1 - (fillFront - d) / EDGE); // 1 at front
          const noise = hash(gx, gy);
          const baseA = 0.14 + noise * 0.2; // glassy, translucent field
          const a = Math.min(baseA + edge * edge * 0.5, 0.82);

          ctx.globalAlpha = a;
          ctx.fillStyle =
            edge > 0.5 ? "#d1fae5" : noise > 0.55 ? "#4ade80" : "#22c55e";
          // +0.6 overdraw closes sub-pixel seams between blocks.
          ctx.fillRect(gx * cw, gy * ch, cw + 0.6, ch + 0.6);
        }
      }

      // Soft green glow riding the leading ring (one additive gradient pass —
      // cheap, and gives the "scanning beam" bloom). Only while it's expanding.
      if (fillFront < 1) {
        const r = fillFront * cornerPx;
        const inner = Math.max(0, r - cw * 2);
        const outer = r + cw * 2;
        const g = ctx.createRadialGradient(
          w / 2,
          h / 2,
          inner,
          w / 2,
          h / 2,
          outer
        );
        g.addColorStop(0, "rgba(34,197,94,0)");
        g.addColorStop(0.5, "rgba(110,231,160,0.35)");
        g.addColorStop(1, "rgba(34,197,94,0)");
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = 1;
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
      }

      if (p < 1) {
        raf = requestAnimationFrame(draw);
      } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.clearRect(0, 0, w, h);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-20 h-full w-full"
    />
  );
}
