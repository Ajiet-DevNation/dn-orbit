"use client";

import { useEffect, useRef } from "react";
import { OrbitStage } from "@/components/home/OrbitStage";
import { onBootSplashDone } from "@/lib/boot-splash";
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
const STAGGER_MS = 95;
/** How long a letter spends scrambling before it settles. */
const DECODE_MS = 300;
/** How often the block glyph swaps while scrambling. */
const FLICKER_MS = 50;
/** Beat before the first letter, so the eye has landed by the time it starts. */
const LEAD_IN_MS = 260;
/** Extra pause on the DEV|NATION boundary — reads as two words, not nine glyphs. */
const WORD_BREAK_MS = 150;
/** Blink period of the trailing block cursor. */
const CURSOR_MS = 460;
/** How long the cursor lingers after the last letter before leaving. */
const CURSOR_HOLD_MS = 1500;
/** Vertical drop a letter falls through as it resolves, in em. */
const DROP_EM = 0.18;

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
        if (!el) return;
        el.textContent = WORD[i];
        el.style.opacity = "1";
        // Clear the in-flight transform/filter so the finished word sits exactly
        // on the baseline at its true colour.
        el.style.transform = "";
        el.style.filter = "";
      });
      if (cursor) cursor.style.opacity = "0";
    };

    // The global CSS reset in globals.css flattens CSS animation but cannot
    // touch a rAF loop, so the reduced-motion path has to be explicit.
    if (prefersReducedMotion()) {
      settle();
      return;
    }

    // When each letter starts, with an extra beat at the DEV|NATION boundary.
    const startAt = WORD.split("").map(
      (_, i) => LEAD_IN_MS + i * STAGGER_MS + (i >= SPLIT ? WORD_BREAK_MS : 0),
    );
    const lastLanded = startAt[WORD.length - 1] + DECODE_MS;

    let raf = 0;
    let start = 0;

    const frame = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;

      for (let i = 0; i < WORD.length; i++) {
        const el = chars[i];
        if (!el) continue;
        const began = startAt[i];

        if (elapsed < began) {
          el.style.opacity = "0";
          continue;
        }

        if (elapsed >= began + DECODE_MS) {
          // Settled: clear the per-letter transform so the word sits perfectly
          // on the baseline rather than a hair off from rounding.
          if (el.textContent !== WORD[i]) {
            el.textContent = WORD[i];
            el.style.opacity = "1";
            el.style.transform = "";
            el.style.filter = "";
          }
          continue;
        }

        // Resolving. Ease the letter in rather than snapping it to full
        // opacity — the snap is what made the old version read as a plain
        // reveal instead of something materialising.
        const t = (elapsed - began) / DECODE_MS;
        const eased = 1 - (1 - t) ** 3;
        el.style.opacity = String(0.25 + 0.75 * eased);
        // Small settle: drops the last fraction of an em into place.
        el.style.transform = `translateY(${(1 - eased) * DROP_EM}em)`;
        // Brightness falls off as it locks in, so the glyph "cools" into the
        // final colour instead of arriving at it.
        el.style.filter = `brightness(${1 + (1 - eased) * 1.4})`;

        // Walk the block ramp, with a flicker so it doesn't march predictably
        // from █ to ░.
        const ramp = Math.min(BLOCKS.length - 1, Math.floor(t * BLOCKS.length));
        const jitter = Math.floor(elapsed / FLICKER_MS + i * 2) % 2;
        const glyph = BLOCKS[Math.min(BLOCKS.length - 1, ramp + jitter)];
        if (el.textContent !== glyph) el.textContent = glyph;
      }

      // Block cursor sits just past the newest letter and blinks throughout,
      // then leaves once the word has been complete for a beat.
      if (cursor) {
        const gone = elapsed > lastLanded + CURSOR_HOLD_MS;
        const lit = elapsed % CURSOR_MS < CURSOR_MS * 0.55;
        cursor.style.opacity = gone || !lit ? "0" : "1";
      }

      if (elapsed < lastLanded + CURSOR_HOLD_MS + 200) {
        raf = requestAnimationFrame(frame);
        return;
      }
      settle();
    };

    // Wait for the boot splash to lift before starting. The hero mounts
    // underneath the splash, so the decode used to play out and finish entirely
    // behind it — by the time the splash faded, the word was already sitting
    // there fully rendered and the animation was never seen.
    const cancel = onBootSplashDone(() => {
      raf = requestAnimationFrame(frame);
    });

    return () => {
      cancel();
      if (raf) cancelAnimationFrame(raf);
    };
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

export function HeroOrbit() {
  return (
    <section className="relative w-full" aria-label="DevNation ORBIT">
      <OrbitStage mode="hero" />

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
