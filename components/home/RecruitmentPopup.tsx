"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { PlutonStage } from "@/components/home/PlutonStage";
import { Button } from "@/components/ui/8bit-button";
import { Z_MODAL } from "@/components/ui/PixelModal";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { onBootSplashDone } from "@/lib/boot-splash";
import { cn } from "@/lib/utils";

// "We're hiring" popup with Pluton. The landing page renders this only while
// an admin has recruitment switched on (same flag as RecruitmentBanner).
// Shown once per browser session, after the boot splash has lifted.
//
// It has its own frame (double violet border, pixel corner brackets) rather
// than PixelModal's chrome, but the same dialog behaviour via useModalBehavior.

const SEEN_KEY = "dn-recruit-popup-seen";
const OPEN_DELAY_MS = 700; // a beat after the splash, so it doesn't feel ambushy

const FEATURES = [
  { icon: "/assets/pluton/icon-code.png", label: "REAL-WORLD PROJECTS" },
  { icon: "/assets/pluton/icon-learn.png", label: "LEARN & EXPERIMENT" },
  { icon: "/assets/pluton/icon-team.png", label: "GROW TOGETHER" },
];

// ─── Entrance timeline (ms) ──────────────────────────────────────────────────
// Backdrop dims → the frame snaps open from a glowing line (width, then
// height, in hard steps) with a glow flash → content cascades in → Pluton pops.
// Exit replays it backwards, faster. rAF-driven: globals.css flattens CSS
// motion under prefers-reduced-motion, so that path is handled explicitly.
const ENTER_MS = 1150;
const EXIT_MS = 320;
const LINE_SCALE = 0.012;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const steps = (p: number, n: number) => Math.ceil(clamp01(p) * n) / n;
const easeOut = (p: number) => 1 - (1 - clamp01(p)) ** 3;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

// Storage can throw (private mode, blocked site data). Failing open only means
// the popup may show again — never that the page breaks.
function wasSeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function markSeen(): void {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {}
}

export function RecruitmentPopup() {
  const [open, setOpen] = useState(false);
  // `mounted` outlives `open` long enough to play the exit.
  const [mounted, setMounted] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (wasSeen()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = onBootSplashDone(() => {
      timer = setTimeout(() => {
        setMounted(true);
        setOpen(true);
      }, OPEN_DELAY_MS);
    });
    return () => {
      stop();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const onOpenChange = useCallback((next: boolean) => {
    if (next) return;
    markSeen();
    setOpen(false);
  }, []);

  useModalBehavior(open, onOpenChange, { containerRef: panelRef });

  // Paint the scene at time `t` of the entrance timeline.
  const paint = useCallback((t: number) => {
    const backdrop = backdropRef.current;
    const panel = panelRef.current;
    const glow = glowRef.current;
    if (!backdrop || !panel) return;

    backdrop.style.opacity = String(clamp01(t / 220));

    const sx =
      LINE_SCALE + (1 - LINE_SCALE) * steps(easeOut((t - 60) / 240), 8);
    const sy =
      LINE_SCALE + (1 - LINE_SCALE) * steps(easeOut((t - 320) / 220), 6);
    panel.style.transform = `scale(${sx}, ${sy})`;
    panel.style.opacity = t > 40 ? "1" : "0";

    // Glow: flares while the frame opens, then settles.
    if (glow) {
      const flare = clamp01((t - 60) / 300);
      const settle = clamp01((t - 560) / 400);
      glow.style.opacity = String(flare * (1 - 0.55 * settle));
    }

    panel.querySelectorAll<HTMLElement>("[data-reveal]").forEach((el, i) => {
      const p = steps((t - 560 - i * 80) / 220, 4);
      el.style.opacity = String(p);
      el.style.transform = `translateY(${(1 - p) * 14}px)`;
    });

    const pop = panel.querySelector<HTMLElement>("[data-pop]");
    if (pop) {
      const p = clamp01((t - 700) / 420);
      // Overshoot to 1.06 at 70%, then settle at 1.
      const s =
        p < 0.7
          ? 0.5 + (1.06 - 0.5) * easeOut(p / 0.7)
          : 1.06 - 0.06 * ((p - 0.7) / 0.3);
      pop.style.opacity = String(steps(p * 2, 4));
      pop.style.transform = `scale(${s})`;
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (prefersReducedMotion()) {
      paint(open ? ENTER_MS : 0);
      if (!open) setMounted(false);
      return;
    }

    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const u = clamp01((now - start) / (open ? ENTER_MS : EXIT_MS));
      paint(open ? u * ENTER_MS : (1 - u) * ENTER_MS);
      if (u < 1) {
        raf = requestAnimationFrame(tick);
      } else if (!open) {
        setMounted(false);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open, mounted, paint]);

  if (!mounted) return null;

  return (
    // Escape (useModalBehavior) and the close button are the keyboard paths out;
    // clicking the backdrop is an extra affordance.
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismissal with a keyboard path
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center bg-[#06020f]/55 p-4 backdrop-blur-[2px]"
      style={{ zIndex: Z_MODAL.base, opacity: 0 }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onOpenChange(false);
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="dark relative w-full max-w-5xl outline-none"
        style={{ opacity: 0, transform: `scale(${LINE_SCALE})` }}
      >
        {/* Violet aura behind the frame. */}
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute -inset-4 bg-[#8b5cf6]/30 blur-2xl"
          style={{ opacity: 0 }}
        />

        <div className="relative border-[3px] border-[#8b5cf6] bg-[#0b0714] shadow-[0_0_22px_rgba(139,92,246,0.6),inset_0_0_26px_rgba(139,92,246,0.16)]">
          <FrameBrackets />

          <div className="flex items-center justify-between gap-4 border-b-[3px] border-[#8b5cf6] bg-[#8b5cf6]/[0.09] px-5 py-3 md:px-6">
            <h2
              id={titleId}
              className="retro flex min-w-0 items-center gap-4 text-[10px] md:text-sm"
            >
              <span aria-hidden className="flex shrink-0 gap-1.5">
                <span className="size-2.5 bg-[#ef4444]" />
                <span className="size-2.5 bg-[#eab308]" />
                <span className="size-2.5 bg-[#22c55e]" />
              </span>
              <span className="truncate">
                <span className="text-[#22c55e]">DEVNATION</span>
                <span className="text-[#c4b5fd]">{" // RECRUITMENT"}</span>
              </span>
            </h2>
            <Button
              type="button"
              size="sm"
              variant="outline"
              aria-label="Close"
              onClick={() => onOpenChange(false)}
              className="shrink-0 text-[10px]"
            >
              <span aria-hidden>✕</span>
            </Button>
          </div>

          <div className="p-2 md:p-2.5">
            <div className="relative max-h-[78vh] overflow-y-auto border-2 border-[#8b5cf6]/45 bg-[radial-gradient(ellipse_at_78%_50%,rgba(139,92,246,0.2),transparent_60%)] px-5 py-6 md:px-9 md:py-8">
              <InnerCorners />

              <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1.15fr_1fr] md:gap-8">
                <div className="order-2 flex flex-col gap-6 md:order-1">
                  <h3 data-reveal className="retro leading-tight">
                    <span className="block text-2xl text-white sm:text-3xl md:text-4xl">
                      WE ARE
                    </span>
                    <span className="mt-2 block text-3xl text-[#22c55e] [text-shadow:0_0_18px_rgba(34,197,94,0.5)] sm:text-4xl md:text-5xl">
                      HIRING!
                    </span>
                  </h3>
                  <p
                    data-reveal
                    className="font-mono text-sm leading-relaxed text-white/85"
                  >
                    Curious minds wanted. Join us to build, learn, experiment,
                    and create things that matter.
                  </p>

                  <ul
                    data-reveal
                    className="grid grid-cols-3 divide-x-2 divide-white/10"
                  >
                    {FEATURES.map((f) => (
                      <li
                        key={f.label}
                        className="flex flex-col items-center gap-2.5 px-2 text-center"
                      >
                        <Image
                          src={f.icon}
                          alt=""
                          width={32}
                          height={32}
                          className="pixelated size-8"
                        />
                        <span className="retro text-[7px] leading-relaxed text-white/85 sm:text-[8px]">
                          {f.label}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div data-reveal className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      asChild
                      className="text-[10px] !bg-[#22c55e] hover:!bg-[#16a34a] !text-black sm:px-6"
                    >
                      <Link href="/recruitments" onClick={markSeen}>
                        JOIN THE CREW ▸
                      </Link>
                    </Button>
                    <button
                      type="button"
                      onClick={() => onOpenChange(false)}
                      className="retro border-4 border-[#22c55e] px-5 py-2 text-[10px] text-[#22c55e] transition-colors hover:bg-[#22c55e]/10"
                    >
                      EXPLORE DEVNATION
                    </button>
                  </div>
                </div>

                <div
                  data-pop
                  className="order-1 mx-auto w-full max-w-[220px] md:order-2 md:max-w-[380px]"
                >
                  <PlutonStage />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Chunky stepped L-brackets on the outer frame's corners, plus a short tick
 * beside each — the targeting-HUD motif, in Pluton's violet. One shape,
 * mirrored per corner.
 */
function FrameBrackets() {
  const corners = [
    "-left-[9px] -top-[9px]",
    "-right-[9px] -top-[9px] -scale-x-100",
    "-bottom-[9px] -left-[9px] -scale-y-100",
    "-bottom-[9px] -right-[9px] -scale-100",
  ];
  return (
    <div aria-hidden>
      {corners.map((pos) => (
        <span
          key={pos}
          className={cn("pointer-events-none absolute z-10 size-10", pos)}
        >
          <span className="absolute left-0 top-0 h-[6px] w-full bg-[#a78bfa]" />
          <span className="absolute left-0 top-0 h-full w-[6px] bg-[#a78bfa]" />
          <span className="absolute left-[6px] top-[6px] size-[5px] bg-[#a78bfa]" />
          {/* Tick along the horizontal edge, just past the bracket. */}
          <span className="absolute left-12 top-0 h-[6px] w-3 bg-[#a78bfa]" />
        </span>
      ))}
    </div>
  );
}

/** Thin L marks inside the content panel's corners. */
function InnerCorners() {
  const corners = [
    "left-1.5 top-1.5",
    "right-1.5 top-1.5 -scale-x-100",
    "bottom-1.5 left-1.5 -scale-y-100",
    "bottom-1.5 right-1.5 -scale-100",
  ];
  return (
    <div aria-hidden>
      {corners.map((pos) => (
        <span
          key={pos}
          className={cn("pointer-events-none absolute size-3", pos)}
        >
          <span className="absolute left-0 top-0 h-[2px] w-full bg-[#c4b5fd]" />
          <span className="absolute left-0 top-0 h-full w-[2px] bg-[#c4b5fd]" />
        </span>
      ))}
    </div>
  );
}
