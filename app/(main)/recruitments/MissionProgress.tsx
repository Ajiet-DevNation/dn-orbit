"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { framePosition, loopFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";
import { GreenBrackets, SignalBars } from "./RecruitHeaderCard";

// Flag-Pluton sheets (PixelLab animate_image, input frame + 8, 64px frames).
const SHEETS = {
  walk: { url: "url(/assets/pluton/pluton-flag-walk.png)", frames: 9 },
  jump: { url: "url(/assets/pluton/pluton-flag-jump.png)", frames: 9 },
};
const PLUTON_PX = 60; // keep in sync with size-[60px] below
const WALK_SPEED = 0.28; // track widths per second
const STEP_MS = 90;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Where Pluton stands for `filled` of `total`: 0 = start, else segment centre. */
function stopFor(filled: number, total: number): number {
  return filled <= 0 ? 0 : (filled - 0.5) / total;
}

function bubbleText(filled: number, total: number): string {
  if (filled >= total) return "All set! Hit REVIEW ▸";
  if (filled === 0) return "Let's complete all the steps and get you on board!";
  return "Nice! Keep going!";
}

/**
 * Segmented progress bar with Pluton walking along it: each newly filled
 * required field walks him one segment (backwards if one is cleared), and at
 * 100% he jumps for joy on a loop. One rAF loop drives position, walk/jump
 * frames and the planet bob; reduced motion places him directly on a static
 * frame.
 */
export function MissionProgress({
  filled,
  total,
}: {
  filled: number;
  total: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const plutonRef = useRef<HTMLDivElement>(null);
  const spriteRef = useRef<HTMLDivElement>(null);
  const planetRef = useRef<HTMLDivElement>(null);
  // Read by the loop; written on prop change without restarting it.
  const goal = useRef({ stop: stopFor(filled, total), done: filled >= total });
  goal.current = { stop: stopFor(filled, total), done: filled >= total };

  useEffect(() => {
    const track = trackRef.current;
    const pluton = plutonRef.current;
    const sprite = spriteRef.current;
    if (!track || !pluton || !sprite) return;

    const place = (pos: number, lift = 0, facingLeft = false) => {
      const w = track.clientWidth;
      const half = PLUTON_PX / 2;
      // Clamp so he never hangs off either end of the bar.
      const x = Math.min(w - half, Math.max(half, pos * w)) - half;
      pluton.style.transform = `translate(${x}px, ${-lift}px) scaleX(${facingLeft ? -1 : 1})`;
    };
    const show = (sheet: keyof typeof SHEETS, frame: number) => {
      const s = SHEETS[sheet];
      sprite.style.backgroundImage = s.url;
      sprite.style.backgroundSize = `${s.frames * 100}% 100%`;
      sprite.style.backgroundPosition = framePosition(frame, s.frames);
    };

    if (prefersReducedMotion()) {
      // No loop: re-place on resize so the static position stays right.
      const draw = () => {
        place(goal.current.stop);
        show(goal.current.done ? "jump" : "walk", 0);
      };
      draw();
      const ro = new ResizeObserver(draw);
      ro.observe(track);
      return () => ro.disconnect();
    }

    let pos = goal.current.stop;
    let facingLeft = false;
    let last = performance.now();
    let walkStart = 0;
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(64, now - last) / 1000;
      last = now;
      const { stop, done } = goal.current;
      const gap = stop - pos;

      if (Math.abs(gap) > 0.002) {
        if (!walkStart) walkStart = now;
        facingLeft = gap < 0;
        pos += Math.sign(gap) * Math.min(Math.abs(gap), WALK_SPEED * dt);
        place(pos, 0, facingLeft);
        // Frame 0 is the idle pose (input frame); the cycle is 1..8.
        show(
          "walk",
          1 + loopFrame(now - walkStart, SHEETS.walk.frames - 1, STEP_MS),
        );
      } else if (done) {
        walkStart = 0;
        // Hop is synced to the sheet: one arc per 9-frame cycle, peaking on
        // the airborne frames mid-cycle.
        const cycle = SHEETS.jump.frames * STEP_MS;
        const hop = Math.sin(((now % cycle) / cycle) * Math.PI) * 12;
        place(pos, Math.round(hop), facingLeft);
        show("jump", loopFrame(now, SHEETS.jump.frames, STEP_MS));
      } else {
        walkStart = 0;
        place(pos, 0, facingLeft);
        show("walk", 0);
      }

      const planet = planetRef.current;
      if (planet) {
        planet.style.transform = `translateY(${Math.round(Math.sin(now / 1400) * 3)}px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="relative border-2 border-[#8b5cf6]/60 bg-[#0b0714] shadow-[0_0_18px_rgba(139,92,246,0.2)]">
      <GreenBrackets />
      <div className="flex flex-col gap-3 p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <span className="retro flex items-center gap-2 text-[9px] tracking-widest text-white/85">
            <SignalBars />
            MISSION PROGRESS
          </span>
          <span className="retro text-[9px] text-[#22c55e]">
            {filled} / {total} REQUIRED
          </span>
        </div>

        {/* Pluton's walkway sits on top of the bar. */}
        <div ref={trackRef} aria-hidden className="relative mt-1 h-[60px]">
          <div ref={plutonRef} className="absolute bottom-0 left-0 size-[60px]">
            <div
              ref={spriteRef}
              className="pixelated size-full bg-no-repeat drop-shadow-[0_0_8px_rgba(139,92,246,0.45)]"
            />
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Required fields completed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={filled}
          className="flex gap-1 border-2 border-white/10 bg-black/40 p-1"
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length segment row
              key={i}
              className={cn(
                "h-3 flex-1 transition-colors",
                i < filled
                  ? "bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.55)]"
                  : "bg-white/[0.06]",
              )}
            />
          ))}
        </div>

        <div className="mt-1 flex items-end justify-between gap-3">
          <p
            aria-live="polite"
            className="relative border-2 border-[#a78bfa] bg-[#0b0714] px-3 py-2 font-mono text-[11px] leading-snug text-white"
          >
            {bubbleText(filled, total)}
          </p>
          <div ref={planetRef} aria-hidden className="shrink-0">
            <Image
              src="/assets/pluton/planet.png"
              alt=""
              width={60}
              height={60}
              className="pixelated"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
