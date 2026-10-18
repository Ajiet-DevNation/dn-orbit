"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef } from "react";
import { useSpriteSheet } from "@/hooks/useSpriteSheet";
import { pingPongFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";

export type Step = "form" | "review" | "done";

const STEPS: Step[] = ["form", "review", "done"];

// Pluton-at-the-laptop sheet (PixelLab animate_image, input frame + 8).
const LAPTOP_FRAMES = 9;

const SPARKLES = [
  { className: "right-[42%] top-[30%]", size: 12, phase: 0 },
  { className: "right-[4%] top-[48%]", size: 16, phase: 700 },
  { className: "right-[30%] bottom-[22%]", size: 10, phase: 1200 },
];

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * The /recruitments intro card: violet HUD frame, title and steps, with Pluton
 * waving from his laptop on the right. Frames are stepped by useSpriteSheet;
 * the float, sparkle blink and bubble pop share one rAF loop below, with an
 * explicit reduced-motion path (static scene).
 */
export function RecruitHeaderCard({ current }: { current: Step | null }) {
  const spriteRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const bubbleRef = useRef<HTMLDivElement>(null);
  const sparkleRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const frameAt = useCallback(
    (t: number) => pingPongFrame(t, LAPTOP_FRAMES, 110, 3600),
    [],
  );
  useSpriteSheet(spriteRef, LAPTOP_FRAMES, frameAt);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const bubble = bubbleRef.current;
    if (bubble) bubble.style.transform = "scale(0)";

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = now - start;
      const float = floatRef.current;
      if (float) {
        float.style.transform = `translateY(${Math.round(Math.sin((t / 2600) * Math.PI * 2) * 3)}px)`;
      }
      sparkleRefs.current.forEach((el, i) => {
        if (!el) return;
        const c = ((t + SPARKLES[i].phase) % 1600) / 1600;
        el.style.opacity = c < 0.5 ? "1" : c < 0.7 ? "0.4" : "0.1";
      });
      if (bubble) {
        const p = Math.min(1, Math.max(0, (t - 500) / 240));
        bubble.style.transform = `scale(${Math.ceil(p * 4) / 4})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const at = current ? STEPS.indexOf(current) : -1;

  return (
    <div className="relative border-2 border-[#8b5cf6]/60 bg-[#0b0714] bg-[radial-gradient(ellipse_at_85%_70%,rgba(139,92,246,0.22),transparent_55%)] shadow-[0_0_18px_rgba(139,92,246,0.25)]">
      <GreenBrackets />

      <div className="relative flex min-h-[240px] flex-col gap-3 p-6 sm:p-7">
        <span className="retro flex items-center gap-2 text-[9px] tracking-widest text-[#22c55e]">
          <SignalBars />
          RECRUITMENT
        </span>
        <h1 className="retro text-lg leading-relaxed sm:text-xl">
          <span className="text-white">JOIN </span>
          <span className="text-[#22c55e] [text-shadow:0_0_14px_rgba(34,197,94,0.45)]">
            DEVNATION
          </span>
        </h1>
        <p className="max-w-[62%] font-mono text-xs leading-relaxed text-[#c4b5fd]/90 sm:text-sm">
          Think you could be part of DevNation? Tell us who you are and what you
          build. Open to AJIET students.
        </p>

        {current && (
          <ol className="mt-auto flex items-center gap-2 border-t-2 border-white/10 pt-4">
            {STEPS.map((s, i) => (
              <li
                key={s}
                aria-current={i === at ? "step" : undefined}
                className={cn(
                  "retro text-[8px] tracking-widest",
                  i === at
                    ? "text-[#22c55e]"
                    : i < at
                      ? "text-white/60"
                      : "text-white/30",
                )}
              >
                {i > 0 && <span className="mr-2 text-white/25">▪</span>}
                {s.toUpperCase()}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Pluton scene — decorative. */}
      <div aria-hidden className="pointer-events-none">
        {SPARKLES.map((s, i) => (
          <span
            key={s.className}
            ref={(el) => {
              sparkleRefs.current[i] = el;
            }}
            className={cn("absolute", s.className)}
          >
            <Image
              src="/assets/pluton/sparkle.png"
              alt=""
              width={s.size}
              height={s.size}
              className="pixelated"
            />
          </span>
        ))}

        <div
          ref={bubbleRef}
          className="absolute right-3 top-4 origin-bottom border-2 border-[#a78bfa] bg-[#0b0714] px-2.5 py-2"
        >
          <p className="font-mono text-[10px] leading-snug text-white sm:text-[11px]">
            Hey!
            <br />
            Let&apos;s find out
            <br />
            more about you!
          </p>
          <span className="absolute -bottom-[7px] left-1/2 size-2.5 rotate-45 border-b-2 border-r-2 border-[#a78bfa] bg-[#0b0714]" />
        </div>

        <div
          ref={floatRef}
          className="absolute bottom-10 right-1 size-[136px] sm:size-[150px]"
        >
          <div
            ref={spriteRef}
            className="pixelated size-full bg-[url(/assets/pluton/pluton-laptop.png)] bg-[length:900%_100%] bg-no-repeat drop-shadow-[0_0_14px_rgba(139,92,246,0.4)]"
          />
        </div>
      </div>
    </div>
  );
}

/** Three rising green bars — the "signal" glyph before RECRUITMENT. */
export function SignalBars() {
  return (
    <span aria-hidden className="flex items-end gap-[2px]">
      <span className="h-[5px] w-[3px] bg-[#22c55e]" />
      <span className="h-[8px] w-[3px] bg-[#22c55e]" />
      <span className="h-[11px] w-[3px] bg-[#22c55e]" />
    </span>
  );
}

/** Green pixel L-brackets on the card's corners. */
export function GreenBrackets() {
  const corners = [
    "-left-[5px] -top-[5px]",
    "-right-[5px] -top-[5px] -scale-x-100",
    "-bottom-[5px] -left-[5px] -scale-y-100",
    "-bottom-[5px] -right-[5px] -scale-100",
  ];
  return (
    <div aria-hidden>
      {corners.map((pos) => (
        <span
          key={pos}
          className={cn("pointer-events-none absolute z-10 size-6", pos)}
        >
          <span className="absolute left-0 top-0 h-1 w-full bg-[#22c55e]" />
          <span className="absolute left-0 top-0 h-full w-1 bg-[#22c55e]" />
          <span className="absolute left-8 top-0 h-1 w-2 bg-[#22c55e]" />
        </span>
      ))}
    </div>
  );
}
