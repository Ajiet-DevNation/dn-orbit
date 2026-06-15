"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Section heading with an 8-bit "decode" entrance ─────────────────────────
// When the heading first scrolls into view it arrives: the whole block fades and
// rises, the title's letters scramble then lock left-to-right (a terminal-style
// decode that fits the pixel theme), and an accent underline draws out from the
// centre. Fires once and stays put.
//
// JS/rAF driven (not CSS), so the global prefers-reduced-motion reset can't
// silently kill it — and because it's time-based we explicitly honour that
// preference by snapping straight to the final state.

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%*<>/\\[]=+";

const FADE_MS = 520; // fade + rise of the whole block
const LOCK_SPAN_MS = 460; // time across which letters lock in, left → right
const PER_LETTER_MS = 70; // additional settle window per letter

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function randomGlyph(): string {
  return GLYPHS[(Math.random() * GLYPHS.length) | 0];
}

interface SectionHeadingProps {
  text: string;
  className?: string;
}

export function SectionHeading({ text, className }: SectionHeadingProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const [display, setDisplay] = useState(text);
  const [progress, setProgress] = useState(0); // 0→1 fade/rise + underline

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    let startTime = 0;
    let fired = false;
    // State starts hidden (progress 0 → opacity 0) showing the plain text, which
    // keeps SSR and client hydration identical. The first rAF frame scrambles
    // the (still-invisible) letters, so there's no flash of un-decoded text.
    const chars = [...text];
    const totalLockTime = LOCK_SPAN_MS + PER_LETTER_MS;

    const tick = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;

      setProgress(Math.min(1, elapsed / FADE_MS));

      const locked = chars.map((ch, i) => {
        if (ch === " ") return " ";
        // Each letter has its own lock moment, spread left→right.
        const lockAt = (i / Math.max(1, chars.length - 1)) * LOCK_SPAN_MS;
        return elapsed >= lockAt + PER_LETTER_MS ? ch : randomGlyph();
      });
      setDisplay(locked.join(""));

      if (elapsed < Math.max(FADE_MS, totalLockTime)) {
        raf = requestAnimationFrame(tick);
      } else {
        setProgress(1);
        setDisplay(text);
      }
    };

    const fire = () => {
      if (fired) return;
      fired = true;
      if (prefersReducedMotion()) {
        setProgress(1);
        setDisplay(text);
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          fire();
          io.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [text]);

  return (
    <div className="mb-12 flex flex-col items-center gap-4">
      <h2
        ref={ref}
        aria-label={text}
        className={cn(
          "retro text-center text-xl tracking-wider text-white",
          className
        )}
        style={{
          opacity: progress,
          transform: `translateY(${(1 - progress) * 18}px)`,
          willChange: "opacity, transform",
        }}
      >
        {/* tabular-nums keeps the box from twitching as glyphs swap width. */}
        <span className="tabular-nums">{display}</span>
      </h2>
      {/* Accent underline that draws out from the centre as the title settles. */}
      <span
        aria-hidden="true"
        className="block h-[3px] w-24 bg-[#22c55e]"
        style={{
          transform: `scaleX(${progress})`,
          transformOrigin: "center",
          willChange: "transform",
        }}
      />
    </div>
  );
}
