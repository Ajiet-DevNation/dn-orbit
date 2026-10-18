"use client";

import { useCallback, useEffect, useRef } from "react";
import { PixelBubble } from "@/components/ui/PixelBubble";
import { useSpriteSheet } from "@/hooks/useSpriteSheet";
import { pingPongFrame } from "@/lib/sprite";
import { cn } from "@/lib/utils";

export type Step = "form" | "review" | "done";

const STEPS: Step[] = ["form", "review", "done"];

// Pluton-at-the-laptop sheet (PixelLab animate_image, input frame + 8).
const LAPTOP_FRAMES = 9;

/**
 * The /recruitments intro card — the original green card, with Pluton waving
 * from his laptop in a column of his own beside the text, so he never covers
 * it. Frames are stepped by useSpriteSheet; the float is a tiny rAF with an
 * explicit reduced-motion path (static).
 */
export function RecruitHeaderCard({ current }: { current: Step | null }) {
  const spriteRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);

  const frameAt = useCallback(
    (t: number) => pingPongFrame(t, LAPTOP_FRAMES, 110, 3600),
    [],
  );
  useSpriteSheet(spriteRef, LAPTOP_FRAMES, frameAt);

  useEffect(() => {
    const el = floatRef.current;
    if (!el || window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
      return;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const y = Math.round(Math.sin(((now - start) / 2600) * Math.PI * 2) * 3);
      el.style.transform = `translateY(${y}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const at = current ? STEPS.indexOf(current) : -1;

  return (
    <div className="flex flex-col gap-3 border-2 border-white/10 border-t-[6px] border-t-[#22c55e] bg-[#0a0a0a] p-6 sm:p-8">
      <span className="retro text-[9px] tracking-widest text-[#22c55e]">
        RECRUITMENT
      </span>

      <div className="grid grid-cols-[1fr_auto] gap-4">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="retro text-lg leading-relaxed text-white sm:text-xl">
            JOIN DEVNATION
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Think you could be part of DevNation? Tell us who you are and what
            you build. Open to AJIET students.
          </p>
        </div>

        {/* Pluton's own column — decorative. */}
        <div aria-hidden className="flex w-[112px] flex-col items-center gap-1">
          <PixelBubble tail="bottom-left" className="text-[9px]">
            Hey! Let&apos;s find out more about you!
          </PixelBubble>
          <div ref={floatRef} className="size-[112px]">
            <div
              ref={spriteRef}
              className="pixelated size-full bg-[url(/assets/pluton/pluton-laptop.png)] bg-[length:900%_100%] bg-no-repeat"
            />
          </div>
        </div>
      </div>

      {current && (
        <ol className="mt-2 flex items-center gap-2 border-t-2 border-white/10 pt-4">
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
                    : "text-white/25",
              )}
            >
              {i > 0 && <span className="mr-2 text-white/25">▸</span>}
              {s.toUpperCase()}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
