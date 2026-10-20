"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { ringCells } from "@/lib/orbit-engine";
import { framePosition, pingPongFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";

// Pluton, alive: floats and sways, an asteroid orbits him (passing behind on
// the far half of the ring, in front on the near half), sparkles blink in
// 8-bit steps, and the scene leans toward the mouse.
//
// rAF-driven and imperative like the rest of the site's signature motion:
// globals.css flattens CSS animation under prefers-reduced-motion, so the
// reduced path is explicit here — a static composed frame, no loop at all.
// rAF also pauses on its own while the tab is hidden.

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// Sparkle layout: position (% of the stage), size (px) and blink phase (ms).
const SPARKLES = [
  { left: 8, top: 18, size: 18, phase: 0 },
  { left: 84, top: 10, size: 14, phase: 420 },
  { left: 92, top: 52, size: 20, phase: 900 },
  { left: 4, top: 66, size: 14, phase: 1300 },
  { left: 72, top: 88, size: 18, phase: 650 },
  { left: 26, top: 4, size: 12, phase: 1100 },
];

// Orbit ellipse, in % of the stage, drawn inside a container tilted by TILT.
const RING = { cx: 50, cy: 60, rx: 47, ry: 13 };
const TILT = -14; // deg
const ORBIT_MS = 7000;
const FLOAT_MS = 3200;
// Wave: ping-pong through the 9 frames (0→8→0, no snap back), then rest.
const WAVE_FRAMES = 9;
const WAVE_STEP_MS = 90;
const WAVE_CYCLE_MS = 4200;

// The ring as square pixel cells, like the landing page's orbits. Plotted once
// with the tilt applied in maths (in tenths of a percent, so it can snap to a
// fine grid) so every cell is an upright square rather than a tilted one.
const RING_DOT = 1.4; // % of the stage
const RING_PIXELS = ringCells({
  rx: RING.rx * 10,
  ry: RING.ry * 10,
  cx: RING.cx * 10,
  cy: RING.cy * 10,
  tilt: (TILT * Math.PI) / 180,
  count: 64,
  cell: 8,
})
  .map((c) => ({ x: c.x / 10, y: c.y / 10, front: c.front }))
  // Two cells that snap to the same spot would collide as React keys.
  .filter(
    (c, i, all) => all.findIndex((o) => o.x === c.x && o.y === c.y) === i,
  );

export function PlutonStage({ className }: { className?: string }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const plutonRef = useRef<HTMLDivElement>(null);
  const waveRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const asteroidLayerRef = useRef<HTMLDivElement>(null);
  const asteroidRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const sparkleRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    // Asteroid start: front-right of the ring, so the static frame reads well.
    const placeAsteroid = (t: number) => {
      const layer = asteroidLayerRef.current;
      const rock = asteroidRef.current;
      if (!layer || !rock) return;
      const x = RING.cx + RING.rx * Math.cos(t);
      const y = RING.cy + RING.ry * Math.sin(t);
      const front = Math.sin(t) > 0; // lower half of the ring faces the viewer
      rock.style.left = `${x}%`;
      rock.style.top = `${y}%`;
      rock.style.transform = `translate(-50%, -50%) scale(${front ? 1.15 : 0.75})`;
      rock.style.opacity = front ? "1" : "0.6";
      layer.style.zIndex = front ? "30" : "10";
    };

    if (prefersReducedMotion()) {
      placeAsteroid(Math.PI / 4);
      return;
    }

    // Parallax target from the mouse (-1..1), eased toward each frame.
    const target = { x: 0, y: 0 };
    const eased = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = stage.getBoundingClientRect();
      target.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      target.y = ((e.clientY - r.top) / r.height) * 2 - 1;
    };
    const onLeave = () => {
      target.x = 0;
      target.y = 0;
    };
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerleave", onLeave);

    // The bubble starts hidden and pops in after a beat, in 4 hard steps.
    const bubble = bubbleRef.current;
    if (bubble) bubble.style.transform = "scale(0)";

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;

      eased.x += (target.x - eased.x) * 0.08;
      eased.y += (target.y - eased.y) * 0.08;

      const pluton = plutonRef.current;
      if (pluton) {
        const phase = (t / FLOAT_MS) * Math.PI * 2;
        const bob = Math.sin(phase) * 8;
        const sway = Math.sin(phase * 0.5) * 3;
        pluton.style.transform = `translate(${-eased.x * 8}px, ${bob - eased.y * 6}px) rotate(${sway}deg)`;
      }
      const ring = ringRef.current;
      if (ring) {
        ring.style.transform = `translate(${eased.x * 5}px, ${eased.y * 4}px)`;
      }
      const layer = asteroidLayerRef.current;
      if (layer) {
        layer.style.transform = `translate(${eased.x * 5}px, ${eased.y * 4}px) rotate(${TILT}deg)`;
      }

      placeAsteroid(Math.PI / 4 + (t / ORBIT_MS) * Math.PI * 2);

      const wave = waveRef.current;
      if (wave) {
        wave.style.backgroundPosition = framePosition(
          pingPongFrame(t, WAVE_FRAMES, WAVE_STEP_MS, WAVE_CYCLE_MS),
          WAVE_FRAMES,
        );
      }

      sparkleRefs.current.forEach((el, i) => {
        if (!el) return;
        // 1.6s cycle per sparkle, hard on/dim/off steps.
        const c = ((t + SPARKLES[i].phase) % 1600) / 1600;
        el.style.opacity = c < 0.5 ? "1" : c < 0.7 ? "0.45" : "0.1";
      });

      if (bubble) {
        // After the popup's own entrance has revealed Pluton (~1.1s).
        const p = Math.min(1, Math.max(0, (t - 1250) / 240));
        bubble.style.transform = `scale(${Math.ceil(p * 4) / 4})`;
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      aria-hidden
      className={cn("relative aspect-square w-full select-none", className)}
    >
      {/* Soft violet nebula behind everything. */}
      <div className="absolute inset-[12%] rounded-full bg-[#8b5cf6]/20 blur-3xl" />

      {SPARKLES.map((s, i) => (
        <div
          key={`${s.left}-${s.top}`}
          ref={(el) => {
            sparkleRefs.current[i] = el;
          }}
          className="absolute z-0"
          style={{ left: `${s.left}%`, top: `${s.top}%` }}
        >
          <Image
            src="/assets/pluton/sparkle.png"
            alt=""
            width={s.size}
            height={s.size}
            className="pixelated"
          />
        </div>
      ))}

      {/* Orbit ring, behind Pluton: pixel cells, near half brighter. */}
      <div ref={ringRef} className="absolute inset-0 z-10">
        <svg
          aria-hidden="true"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          shapeRendering="crispEdges"
          className="h-full w-full overflow-visible [filter:drop-shadow(0_0_4px_#8b5cf6)]"
        >
          {RING_PIXELS.map((c) => (
            <rect
              key={`${c.x}-${c.y}`}
              x={c.x - RING_DOT / 2}
              y={c.y - RING_DOT / 2}
              width={RING_DOT}
              height={RING_DOT}
              fill={c.front ? "#c4b5fd" : "#8b5cf6"}
              fillOpacity={c.front ? 1 : 0.6}
            />
          ))}
        </svg>
      </div>

      {/* Pluton. */}
      <div
        ref={plutonRef}
        className="absolute inset-[14%] z-20 flex items-center justify-center"
      >
        {/* 9-frame wave sprite sheet (PixelLab animate_image); the loop below
            steps backgroundPosition. Frame 0 is the resting smile. */}
        <div
          ref={waveRef}
          className="pixelated aspect-square h-full bg-[url(/assets/pluton/pluton-wave.png)] bg-[length:900%_100%] bg-no-repeat drop-shadow-[0_0_24px_rgba(139,92,246,0.45)]"
        />
      </div>

      {/* Asteroid: its layer's z-index flips so it passes behind/in front. */}
      <div
        ref={asteroidLayerRef}
        className="pointer-events-none absolute inset-0 z-10"
        style={{ transform: `rotate(${TILT}deg)` }}
      >
        <div ref={asteroidRef} className="absolute">
          <Image
            src="/assets/pluton/asteroid.png"
            alt=""
            width={32}
            height={32}
            className="pixelated"
          />
        </div>
      </div>

      {/* Speech bubble. */}
      <div
        ref={bubbleRef}
        className="absolute -top-2 right-0 z-40 origin-bottom-left border-4 border-[#a78bfa] bg-[#0a0a0a] px-3 py-2 sm:right-2"
      >
        <p className="retro text-[8px] leading-relaxed text-white sm:text-[10px]">
          LET&apos;S BUILD
          <br />
          TOGETHER!
        </p>
        {/* Pixel tail. */}
        <span className="absolute -bottom-[10px] left-4 size-3 rotate-45 border-b-4 border-r-4 border-[#a78bfa] bg-[#0a0a0a]" />
      </div>
    </div>
  );
}
