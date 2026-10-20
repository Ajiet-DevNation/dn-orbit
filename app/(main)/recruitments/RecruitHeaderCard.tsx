"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { PixelBubble } from "@/components/ui/PixelBubble";
import { PixelFrame } from "@/components/ui/PixelFrame";
import { useSpriteSheet } from "@/hooks/useSpriteSheet";
import { pingPongFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";

export type Step = "form" | "review" | "done";

const STEPS: Step[] = ["form", "review", "done"];

// Pluton-at-the-laptop sheet (PixelLab animate_image, input frame + 8).
const LAPTOP_FRAMES = 9;

// Twinkles around Pluton: position within the scene, size (px), blink phase.
const SPARKLES = [
  { className: "left-[6%] top-[38%]", size: 22, phase: 0 },
  { className: "right-[6%] top-[42%]", size: 22, phase: 500 },
  { className: "right-[16%] top-[30%]", size: 11, phase: 900 },
  { className: "left-[18%] top-[56%]", size: 11, phase: 1300 },
  { className: "right-[2%] top-[66%]", size: 11, phase: 300 },
];

export function SignalBars() {
  return (
    <span aria-hidden className="flex items-end gap-[3px]">
      <span className="h-3 w-1 bg-brand" />
      <span className="h-3 w-1 bg-brand" />
      <span className="h-3 w-1 bg-brand" />
    </span>
  );
}

/**
 * The /recruitments hero card: purple pixel frame, JOIN / DEVNATION, steps, and
 * Pluton waving from his laptop on a rock with a speech bubble and twinkles.
 * Frames are stepped by useSpriteSheet; the float and sparkle blink share one
 * small rAF loop with an explicit reduced-motion path (static).
 */
export function RecruitHeaderCard({ current }: { current: Step | null }) {
  const spriteRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const sparkleRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const frameAt = useCallback(
    (t: number) => pingPongFrame(t, LAPTOP_FRAMES, 110, 3600),
    [],
  );
  useSpriteSheet(spriteRef, LAPTOP_FRAMES, frameAt);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      const el = floatRef.current;
      if (el) {
        const y = Math.round(Math.sin((t / 2600) * Math.PI * 2) * 3);
        el.style.transform = `translateY(${y}px)`;
      }
      sparkleRefs.current.forEach((s, i) => {
        if (!s) return;
        const c = ((t + SPARKLES[i].phase) % 1600) / 1600;
        s.style.opacity = c < 0.5 ? "1" : c < 0.7 ? "0.4" : "0.1";
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const at = current ? STEPS.indexOf(current) : -1;

  return (
    <PixelFrame>
      <div className="grid grid-cols-1 gap-6 px-3 py-2 md:grid-cols-[1.15fr_1fr] md:gap-4 md:px-5">
        <div className="flex flex-col gap-5">
          <span className="retro flex items-center gap-3 text-[10px] tracking-widest text-brand-light sm:text-xs">
            <SignalBars />
            RECRUITMENT
            <span aria-hidden className="h-[2px] flex-1 bg-white/15" />
          </span>
          {/* 24px below 380px: nine pixel-font glyphs of DEVNATION at 30px are
              wider than the card on a 320px phone. */}
          <h1 className="retro text-2xl leading-tight min-[380px]:text-3xl sm:text-4xl lg:text-5xl">
            <span className="block text-white">JOIN</span>
            <span className="mt-2 block text-brand-light">DEVNATION</span>
          </h1>
          <p className="font-mono text-sm leading-relaxed text-[#d4d0ea] sm:text-base">
            Think you could be part of DevNation?{" "}
            <br className="hidden sm:block" />
            Tell us who you are and what you build.{" "}
            <br className="hidden sm:block" />
            Open to AJIET students.
          </p>
          {current && (
            <ol className="mt-1 flex items-center gap-3 border-t-2 border-white/15 pt-4">
              {STEPS.map((s, i) => (
                <li
                  key={s}
                  aria-current={i === at ? "step" : undefined}
                  className={cn(
                    "retro text-[10px] tracking-widest sm:text-xs",
                    i === at
                      ? "text-brand-light"
                      : i < at
                        ? "text-white/70"
                        : "text-[#6d6a8a]",
                  )}
                >
                  {i > 0 && <span className="mr-3 text-[#6d6a8a]">·</span>}
                  {s.toUpperCase()}
                </li>
              ))}
            </ol>
          )}
        </div>

        {/* Pluton scene — decorative. */}
        <div
          aria-hidden
          className="relative flex min-h-[250px] flex-col items-end md:min-h-0"
        >
          <PixelBubble tail="bottom-left" className="text-sm sm:text-base">
            Hey, cadet! Let&apos;s get to know you.
          </PixelBubble>

          {SPARKLES.map((s, i) => (
            <span
              key={s.className}
              ref={(el) => {
                sparkleRefs.current[i] = el;
              }}
              className={cn("absolute", s.className)}
            >
              <Image
                src="/assets/pluton/sparkle4.png"
                alt=""
                width={s.size}
                height={s.size}
                className="pixelated"
              />
            </span>
          ))}

          {/* 208×128 frames (13:8), centred; scaled 1.25× / 1.5× / 2×. */}
          <div
            ref={floatRef}
            className="absolute -bottom-2 left-1/2 -ml-[130px] h-[160px] w-[260px] md:-ml-[156px] md:h-[192px] md:w-[312px] lg:-ml-[208px] lg:h-[256px] lg:w-[416px]"
          >
            <div
              ref={spriteRef}
              className="pixelated size-full bg-[url(/assets/pluton/pluton-laptop-v2.png)] bg-[length:900%_100%] bg-no-repeat"
            />
          </div>
        </div>
      </div>
    </PixelFrame>
  );
}
