"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { PixelBubble } from "@/components/ui/PixelBubble";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { framePosition, loopFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";
import { SignalBars } from "./RecruitHeaderCard";

// Flag-Pluton sheets (PixelLab animate_image, input frame + 8, 64px frames).
const SHEETS = {
  walk: { url: "url(/assets/pluton/pluton-flag-walk.png)", frames: 9 },
  jump: { url: "url(/assets/pluton/pluton-flag-jump.png)", frames: 9 },
};
const PLUTON_PX = 64; // keep in sync with size-[64px] below
const WALK_SPEED = 0.28; // bar widths per second
const STEP_MS = 90;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

function bubbleText(filled: number, total: number): string {
  if (filled >= total) return "All set! Hit REVIEW!";
  if (filled === 0) return "Let's get you on board!";
  return "Nice! Keep going!";
}

/**
 * MISSION PROGRESS: a segmented bar in the purple pixel frame, with Pluton
 * walking along underneath it:
 * he stands under the fill's leading edge, walks there whenever a required
 * field is filled (or back when one is cleared), and jumps for joy at 100%.
 * His speech bubble rides beside him and pops when its text changes.
 *
 * One rAF loop drives position, walk/jump frames and the pop; reduced motion
 * places him directly on a static frame.
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
  const popRef = useRef<HTMLDivElement>(null);
  const popAt = useRef(0);

  const stop = total > 0 ? filled / total : 0;
  const done = filled >= total;
  const text = bubbleText(filled, total);
  // Past the middle the bubble moves to his left so it stays inside the card.
  const bubbleOnLeft = stop > 0.55;

  // Read by the loop; written each render without restarting it.
  const goal = useRef({ stop, done });
  goal.current = { stop, done };

  // biome-ignore lint/correctness/useExhaustiveDependencies: re-pop on every text change
  useEffect(() => {
    popAt.current = performance.now();
  }, [text]);

  useEffect(() => {
    const track = trackRef.current;
    const pluton = plutonRef.current;
    const sprite = spriteRef.current;
    if (!track || !pluton || !sprite) return;

    const place = (pos: number, lift = 0) => {
      const w = track.clientWidth;
      const half = PLUTON_PX / 2;
      // Clamped so he never hangs off either end of the bar.
      const x = Math.min(w - half, Math.max(half, pos * w)) - half;
      pluton.style.transform = `translate(${x}px, ${-lift}px)`;
    };
    const show = (
      sheet: keyof typeof SHEETS,
      frame: number,
      facingLeft = false,
    ) => {
      const s = SHEETS[sheet];
      sprite.style.backgroundImage = s.url;
      sprite.style.backgroundSize = `${s.frames * 100}% 100%`;
      sprite.style.backgroundPosition = framePosition(frame, s.frames);
      sprite.style.transform = facingLeft ? "scaleX(-1)" : "";
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
      const g = goal.current;
      const gap = g.stop - pos;

      if (Math.abs(gap) > 0.002) {
        if (!walkStart) walkStart = now;
        facingLeft = gap < 0;
        pos += Math.sign(gap) * Math.min(Math.abs(gap), WALK_SPEED * dt);
        place(pos);
        // Frame 0 is the idle pose (input frame); the walk cycle is 1..8.
        show(
          "walk",
          1 + loopFrame(now - walkStart, SHEETS.walk.frames - 1, STEP_MS),
          facingLeft,
        );
      } else if (g.done) {
        walkStart = 0;
        // Hop synced to the sheet: one arc per 9-frame cycle.
        const cycle = SHEETS.jump.frames * STEP_MS;
        const hop = Math.sin(((now % cycle) / cycle) * Math.PI) * 10;
        place(pos, Math.round(hop));
        show("jump", loopFrame(now, SHEETS.jump.frames, STEP_MS));
      } else {
        walkStart = 0;
        place(pos);
        show("walk", 0);
      }

      const pop = popRef.current;
      if (pop) {
        const p = Math.min(1, (now - popAt.current) / 220);
        pop.style.transform = `scale(${Math.ceil(p * 4) / 4})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <PixelFrame>
      <div className="flex flex-col gap-4 px-1 py-1">
        <div className="flex items-center justify-between gap-3">
          <span className="retro flex items-center gap-2.5 whitespace-nowrap text-[9px] tracking-widest text-white">
            <SignalBars />
            MISSION PROGRESS
          </span>
          <span className="retro whitespace-nowrap text-[9px] text-brand-light">
            {filled} / {total} REQUIRED
          </span>
        </div>

        {/* Segmented bar: one cell per required field. */}
        <div
          role="progressbar"
          aria-label="Required fields completed"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={filled}
          className="flex gap-[3px] border-[3px] border-brand bg-brand p-[3px]"
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length segment row
              key={i}
              className={cn(
                "h-4 flex-1",
                i < filled ? "bg-brand-light" : "bg-[#1a1838]",
              )}
            />
          ))}
        </div>

        {/* Pluton's walkway, under the bar. */}
        <div ref={trackRef} className="relative h-[76px]">
          <div ref={plutonRef} className="absolute bottom-0 left-0 size-[64px]">
            <div
              ref={spriteRef}
              aria-hidden
              className="pixelated size-full bg-no-repeat"
            />
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2",
                bubbleOnLeft
                  ? "right-[calc(100%+20px)]"
                  : "left-[calc(100%+20px)]",
              )}
            >
              <div
                ref={popRef}
                className={bubbleOnLeft ? "origin-right" : "origin-left"}
              >
                <PixelBubble
                  tail={bubbleOnLeft ? "right" : "left"}
                  className="whitespace-nowrap text-xs"
                >
                  <span aria-live="polite">{text}</span>
                </PixelBubble>
              </div>
            </div>
          </div>
          <Image
            src="/assets/pluton/sparkle4.png"
            alt=""
            aria-hidden
            width={22}
            height={22}
            className="pixelated absolute right-1 top-2"
          />
        </div>
      </div>
    </PixelFrame>
  );
}
