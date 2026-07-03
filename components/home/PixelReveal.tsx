"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// ─── Pixel-block reveal ───────────────────────────────────────────────────────
// Reveals its children with an 8-bit dissolve instead of a fade: a grid of
// background-coloured cells covers the content, then clears in a scattered,
// pixel-by-pixel order when it scrolls into view — the same "blocks build the
// image" feel as the loading-screen logo, run in reverse.
//
// Per-cell delays are derived deterministically from the cell index (no
// Math.random) and rounded to whole milliseconds, so the server-rendered value
// survives the browser's CSSOM precision rounding and hydration matches. It's a
// CSS transition, which
// the global prefers-reduced-motion reset flattens to instant — the correct,
// accessible behaviour for a scroll reveal (the content simply appears).

const COLS = 14;
const ROWS = 10;
const CELL_COUNT = COLS * ROWS;
const DURATION_MS = 220;
const SPREAD_MS = 520; // scatter window across all cells

// Deterministic pseudo-random in [0, 1) from an integer.
function pseudoRandom(i: number): number {
  const r = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return r - Math.floor(r);
}

interface PixelRevealProps {
  children: React.ReactNode;
  className?: string;
  /** Base delay before this block starts dissolving (for staggering siblings). */
  delayMs?: number;
  /** Cover colour — should match the surface behind the content. */
  coverColor?: string;
}

export function PixelReveal({
  children,
  className,
  delayMs = 0,
  coverColor = "#0a0a0a",
}: PixelRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No reduced-motion branch needed: the global CSS flattens the cell
    // transitions to instant, so the reveal simply has no motion for those users.
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          // Drop the cover grid from the DOM once it has fully cleared.
          window.setTimeout(
            () => setDone(true),
            delayMs + SPREAD_MS + DURATION_MS,
          );
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delayMs]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      {children}
      {!done && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 grid"
          style={{
            gridTemplateColumns: `repeat(${COLS}, 1fr)`,
            gridTemplateRows: `repeat(${ROWS}, 1fr)`,
          }}
        >
          {Array.from({ length: CELL_COUNT }, (_, i) => (
            <span
              key={i}
              style={{
                backgroundColor: coverColor,
                opacity: revealed ? 0 : 1,
                transition: `opacity ${DURATION_MS}ms steps(2, end)`,
                transitionDelay: `${Math.round(delayMs + pseudoRandom(i) * SPREAD_MS)}ms`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
