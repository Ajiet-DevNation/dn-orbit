"use client";

import { useEffect, useRef } from "react";
import { OrbitStage } from "@/components/home/OrbitStage";
import { cn } from "@/lib/utils";

// ─── The landing hero ────────────────────────────────────────────────────────
//
// A thin shell over the shared OrbitStage. The stage owns the logo's position
// (see HERO_START_SCALE / LOGO_BASE_OFFSET_Y there), so everything here is
// layered around it and never displaces it — that is what keeps the boot-splash
// hand-off seamless.
//
// Deliberately just the wordmark and a scroll cue. A tagline, a live stat strip
// and two CTAs were tried here and cut: they crowded the orbit and pulled the
// eye away from the logo, which is the thing the hero is actually for.

const SWEEP_MS = 900;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// ─── Pixel decode wordmark ───────────────────────────────────────────────────
//
// Letters land one at a time, and each one resolves out of a run of solid
// block glyphs before settling — a terminal decoding a signal rather than a
// plain typewriter. The blocks are what make it read as pixel-art; a straight
// character-by-character reveal in this font just looks like slow text.

/** Densest to sparsest, so a character visibly "resolves" as it locks in. */
const BLOCKS = ["█", "▓", "▒", "░"] as const;

/** Delay between one letter starting and the next. */
const STAGGER_MS = 110;
/** How long a letter spends scrambling before it settles. */
const DECODE_MS = 260;
/** How often the block glyph swaps while scrambling. */
const FLICKER_MS = 55;

const WORD = "DEVNATION";
/** Index at which the colour switches from white to accent green. */
const SPLIT = 3;

function Wordmark() {
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const cursorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const chars = charRefs.current;
    const cursor = cursorRef.current;

    const settle = () => {
      chars.forEach((el, i) => {
        if (el) {
          el.textContent = WORD[i];
          el.style.opacity = "1";
        }
      });
      if (cursor) cursor.style.opacity = "0";
    };

    // The global CSS reset in globals.css flattens CSS animation but cannot
    // touch a rAF loop, so the reduced-motion path has to be explicit.
    if (prefersReducedMotion()) {
      settle();
      return;
    }

    const total = WORD.length * STAGGER_MS + DECODE_MS;
    let raf = 0;
    const start = performance.now();

    const frame = (now: number) => {
      const elapsed = now - start;

      for (let i = 0; i < WORD.length; i++) {
        const el = chars[i];
        if (!el) continue;
        const began = i * STAGGER_MS;

        if (elapsed < began) {
          el.style.opacity = "0";
          continue;
        }

        el.style.opacity = "1";

        if (elapsed >= began + DECODE_MS) {
          if (el.textContent !== WORD[i]) el.textContent = WORD[i];
          continue;
        }

        // Walk the block ramp as the character resolves, with a flicker on top
        // so it doesn't march predictably from █ to ░.
        const t = (elapsed - began) / DECODE_MS;
        const ramp = Math.min(BLOCKS.length - 1, Math.floor(t * BLOCKS.length));
        const jitter = Math.floor(elapsed / FLICKER_MS + i) % 2;
        const glyph = BLOCKS[Math.min(BLOCKS.length - 1, ramp + jitter)];
        if (el.textContent !== glyph) el.textContent = glyph;
      }

      // Block cursor rides just past the last landed character, then blinks a
      // couple of times and leaves.
      if (cursor) {
        const done = elapsed >= total;
        const blink = Math.floor(elapsed / 420) % 2 === 0;
        cursor.style.opacity = done && !blink ? "0" : "1";
      }

      if (elapsed < total + 1400) {
        raf = requestAnimationFrame(frame);
        return;
      }
      settle();
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <h1
      className="retro text-2xl leading-none tracking-[0.08em] text-white sm:text-4xl"
      // The animated spans are decorative scaffolding; give assistive tech the
      // finished word rather than a stream of block characters.
      aria-label={WORD}
    >
      <span aria-hidden className="inline-flex items-baseline">
        {WORD.split("").map((char, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: fixed-length word —
            // the index IS the identity, and letters repeat.
            key={i}
            ref={(el) => {
              charRefs.current[i] = el;
            }}
            className={cn(
              "inline-block",
              i >= SPLIT ? "text-[#22c55e]" : "text-white",
            )}
            style={{ opacity: 0 }}
          >
            {char}
          </span>
        ))}
        <span
          ref={cursorRef}
          className="ml-1 inline-block text-[#22c55e]"
          style={{ opacity: 0 }}
        >
          █
        </span>
      </span>
    </h1>
  );
}

/**
 * One-shot CRT power-on: a bright band sweeps down the hero as it mounts, the
 * way a tube warms up. Transform + opacity only, so it stays on the compositor.
 */
function useCrtSweep(ref: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.style.opacity = "0";
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / SWEEP_MS);
      el.style.transform = `translate3d(0, ${t * 100}vh, 0)`;
      el.style.opacity = String((1 - t) * 0.55);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
        return;
      }
      el.style.opacity = "0";
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}

export function HeroOrbit() {
  const sweepRef = useRef<HTMLDivElement>(null);
  useCrtSweep(sweepRef);

  return (
    <section className="relative w-full" aria-label="DevNation ORBIT">
      <OrbitStage mode="hero" />

      {/* CRT power-on band. pointer-events-none so it never eats a drag. */}
      <div
        ref={sweepRef}
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[70] h-24"
        style={{
          opacity: 0,
          background:
            "linear-gradient(to bottom, transparent, rgba(34,197,94,0.10) 35%, rgba(255,255,255,0.18) 50%, rgba(34,197,94,0.10) 65%, transparent)",
          willChange: "transform, opacity",
        }}
      />

      {/* pointer-events-none on the wrapper so the whole area above stays
          draggable; the scroll cue opts back in. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-8 px-6 pb-12 text-center sm:pb-16">
        <Wordmark />
        <ScrollCue />
      </div>
    </section>
  );
}

/**
 * Blinking chevron telling the visitor there is more below. Stepped opacity
 * (not a smooth fade) to match the 8-bit language, and rAF-driven so the
 * reduced-motion reset can't freeze it mid-blink — under reduced motion it
 * simply renders static.
 */
function ScrollCue() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      // 1.2s period, hard on/off — a blink, not a pulse.
      el.style.opacity = ((now - start) % 1200 < 700 ? 1 : 0.25).toString();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <a
      href="#about"
      className={cn(
        "pointer-events-auto flex flex-col items-center gap-1.5",
        "retro text-[8px] tracking-widest text-muted-foreground",
        "transition-colors hover:text-[#22c55e]",
      )}
      aria-label="Scroll to learn about DevNation"
    >
      SCROLL
      <span ref={ref} aria-hidden className="text-sm leading-none">
        ▼
      </span>
    </a>
  );
}
