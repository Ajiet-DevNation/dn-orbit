"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { OrbitStage } from "@/components/home/OrbitStage";
import { Button } from "@/components/ui/8bit-button";
import { cn } from "@/lib/utils";

// ─── The landing hero ────────────────────────────────────────────────────────
//
// A thin shell over the shared OrbitStage that adds everything around the
// orbit. The page used to render the stage alone: a logo, three orbiting icons,
// and nothing else — no wordmark, no tagline, no call to action, no indication
// there was anything below the fold.
//
// The stage owns the logo's position (see HERO_START_SCALE / LOGO_BASE_OFFSET_Y
// there), so the content here is layered around it and never displaces it —
// that's what keeps the boot-splash hand-off seamless.

export interface HeroStats {
  members: number;
  projects: number;
  events: number;
  commits: number;
}

interface HeroOrbitProps {
  stats: HeroStats;
  isAuthenticated: boolean;
}

const COUNT_UP_MS = 1400;
const SWEEP_MS = 900;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** Chunky separator between stat cells. */
function Tick() {
  return <span aria-hidden className="hidden h-6 w-px bg-white/15 sm:block" />;
}

/**
 * A single stat that counts up from zero on mount.
 *
 * The value is written to the DOM by a rAF loop rather than held in state — one
 * ticker at 60fps would otherwise re-render this subtree ~84 times, and there
 * are four of them. Also means the count survives the global reduced-motion CSS
 * reset, which only flattens CSS animation; the reduced-motion path here is
 * explicit (render the final number immediately).
 */
function StatCell({ label, value }: { label: string; value: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const format = (n: number) =>
      n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);

    if (prefersReducedMotion() || value === 0) {
      el.textContent = format(value);
      return;
    }

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      // easeOutExpo: sprints then eases into the real figure.
      const eased = t === 1 ? 1 : 1 - 2 ** (-10 * t);
      el.textContent = format(Math.round(value * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return (
    <div className="flex min-w-[72px] flex-col items-center gap-1.5">
      <span
        ref={ref}
        className="retro text-lg tabular-nums text-[#22c55e] sm:text-xl"
      >
        0
      </span>
      <span className="retro text-[8px] tracking-widest text-muted-foreground">
        {label}
      </span>
    </div>
  );
}

/**
 * One-shot CRT power-on: a bright band sweeps down the hero as it mounts, the
 * way a tube warms up. Driven imperatively (transform + opacity only, so it
 * stays on the compositor) because the global prefers-reduced-motion reset
 * would flatten a CSS version to nothing.
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
      // Bright at the top, gone by the bottom.
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

export function HeroOrbit({ stats, isAuthenticated }: HeroOrbitProps) {
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

      {/* Content sits below the orbit cluster. pointer-events-none on the
          wrapper so the whole area above stays draggable; the controls opt back
          in individually. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-40 flex flex-col items-center gap-7 px-6 pb-10 text-center sm:pb-14">
        <div className="flex flex-col items-center gap-3">
          <h1 className="retro text-xl leading-tight text-white sm:text-3xl">
            DEV<span className="text-[#22c55e]">NATION</span>
          </h1>
          <p className="max-w-xl text-[11px] leading-relaxed text-muted-foreground sm:text-sm">
            The student developer community at AJIET. We build real projects,
            ship open source, and keep score while we do it.
          </p>
        </div>

        {/* Live figures, straight from the database. */}
        <div className="pointer-events-auto flex items-center gap-5 border-2 border-white/10 bg-[#0a0a0a]/70 px-5 py-3 backdrop-blur-sm sm:gap-7 sm:px-7">
          <StatCell label="MEMBERS" value={stats.members} />
          <Tick />
          <StatCell label="PROJECTS" value={stats.projects} />
          <Tick />
          <StatCell label="EVENTS" value={stats.events} />
          <Tick />
          <StatCell label="COMMITS" value={stats.commits} />
        </div>

        <div className="pointer-events-auto flex flex-col items-center gap-4 sm:flex-row">
          {!isAuthenticated && (
            <Button asChild className="text-[10px]">
              <Link href="/login">JOIN DEVNATION</Link>
            </Button>
          )}
          <Button asChild variant="outline" className="text-[10px]">
            <a href="#about">EXPLORE ORBIT</a>
          </Button>
        </div>

        <ScrollCue />
      </div>
    </section>
  );
}

/**
 * Blinking chevron telling the visitor there is more below. Stepped opacity
 * (not a smooth fade) to match the 8-bit language, and driven by rAF so the
 * reduced-motion CSS reset doesn't silently freeze it mid-blink — under reduced
 * motion it simply renders static.
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
