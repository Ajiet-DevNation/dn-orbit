"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { accumulateVelocity, flingTarget } from "@/lib/coverflow-fling";

// ─── Looping 3D coverflow controller ──────────────────────────────────────────
// Drives a focus-based cover-flow: the centred card is full-size, upright, and on
// top; its neighbours recede behind it (scaled, dimmed, pushed back in Z) and
// tilt away in 3D on BOTH sides — the indices wrap, so the centre is always
// flanked and the row fills the stage edge to edge. Focus is driven by pointer
// drag + ◀ ▶ arrow keys + click-to-centre + a gentle idle auto-advance, all eased
// by one rAF loop. Everything is imperative (transforms written straight to the
// card refs), so there are no per-frame React renders — the only React state is
// the settled centre index, surfaced for an external position indicator.
//
// Shared by the Projects and Members sections. The consumer renders the cards,
// hands each one back via `registerCard(i)`, spreads `stageHandlers` on the drag
// area, and reads `activeIndex` / `next` / `prev` / `goTo` for nav chrome.
// Tapping the centred card calls `onActivateCenter(i, el)`; tapping any other
// card brings it to the centre.
//
// The 3D requires the consumer to set `perspective` on the stage (the cards'
// offset parent) so the per-card `rotateY`/`translateZ` foreshortens correctly.

interface CoverflowOptions {
  count: number;
  /** Horizontal centre-to-centre gap in px (< card width → cards overlap). */
  spread: number;
  scaleStep?: number;
  opacityStep?: number;
  /** Degrees of Y-rotation per unit of (clamped) distance from centre. */
  tilt?: number;
  /** Pixels pushed back in Z per unit of distance from centre. */
  depth?: number;
  /** Idle auto-advance period in ms (0 disables it). */
  autoAdvanceMs?: number;
  /** Freezes ONLY the idle auto-advance (drag/keys still work), e.g. while a
   *  card is flipped open for reading. Distinct from `disabled`. */
  paused?: boolean;
  /** When true, pointer/keys/auto-advance are ignored (e.g. a detail overlay is open). */
  disabled?: boolean;
  onActivateCenter?: (index: number, el: HTMLElement) => void;
}

const TAU_MS = 110;
const MAX_DT_MS = 50;
const DRAG_THRESHOLD = 5;
const MAX_VISUAL_DISTANCE = 3.5;
// Tilt saturates fast so the immediate neighbours already read as angled pages
// rather than the row fanning ever-flatter into the distance.
const MAX_TILT_DISTANCE = 1.4;
const INTRO_TAU_MS = 260;
const SETTLE_EPS = 0.001;

// Shortest signed distance from a to b around a ring of `n` (so cards wrap and
// both sides stay populated).
function wrapDelta(d: number, n: number): number {
  let r = ((d % n) + n) % n;
  if (r > n / 2) r -= n;
  return r;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

export function useCoverflow({
  count,
  spread,
  scaleStep = 0.12,
  opacityStep = 0.32,
  tilt = 34,
  depth = 140,
  autoAdvanceMs = 0,
  paused = false,
  disabled = false,
  onActivateCenter,
}: CoverflowOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Last-written z-index / pointer-events per card. transform & opacity are
  // compositor-only (cheap to rewrite each frame), but z-index and
  // pointer-events force a style recalc, so we only touch them when they
  // actually change — this is what keeps the drag buttery instead of steppy.
  const lastZRef = useRef<number[]>([]);
  const lastPeRef = useRef<("auto" | "none")[]>([]);
  // Last-written HUD vars per card. Setting a custom property invalidates the
  // card's style, so — like z-index — we only write when the rounded value
  // actually changes, sparing the cards whose distance barely moved this frame.
  const lastDepthRef = useRef<number[]>([]);
  const lastCenterRef = useRef<number[]>([]);
  // The HUD overlay roots inside each card (elements marked [data-hud]).
  //
  // --cf-depth / --cf-center used to be written to the CARD root. A custom
  // property is inherited, so every write invalidated style for the card's
  // ENTIRE subtree — and a member card is ~30 nodes (two faces, each with a
  // frame, four brackets, badges, labels). Fifteen cards × two faces × those
  // nodes, re-resolved whenever a card's distance crossed a 1/100 boundary
  // during a drag, was the dominant cost in the "slideshow" jank.
  //
  // Writing to the overlay root instead confines the invalidation to the six or
  // seven leaves that actually read the vars. Resolved once per card element
  // and cached; re-resolved only when the card's DOM node identity changes.
  const hudElsRef = useRef<(HTMLElement[] | null)[]>([]);
  const hudOwnerRef = useRef<(HTMLElement | null)[]>([]);

  const focusRef = useRef(0);
  const targetRef = useRef(0);
  const manualRef = useRef(0);
  const draggingRef = useRef(false);
  const hoverRef = useRef(false);
  const downXRef = useRef(0);
  const startManualRef = useRef(0);
  const movedRef = useRef(false);
  const inViewRef = useRef(false);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const dragAbortRef = useRef<AbortController | null>(null);
  // Fling state — see onPointerDown.
  const velocityRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);

  // Intro: cards fan in (spread + fade + rise) the first time the section is
  // seen. `introRef` eases 0 → `introTargetRef`. Under reduced-motion it snaps
  // straight to 1 so the row is simply present, no entrance.
  const introRef = useRef(0);
  const introTargetRef = useRef(0);
  const reduceMotionRef = useRef(false);

  // The only React state: the settled centre index, for a position indicator.
  const [activeIndex, setActiveIndex] = useState(0);

  const disabledRef = useRef(disabled);
  const pausedRef = useRef(paused);
  const onActivateRef = useRef(onActivateCenter);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    onActivateRef.current = onActivateCenter;
  }, [onActivateCenter]);

  // Last value handed to React, so we can skip the setState entirely when the
  // centre hasn't actually changed.
  //
  // This used to call setActiveIndex unconditionally from setTarget, which runs
  // on EVERY pointermove. React's Object.is bail-out hid it while a drag stayed
  // within one card, but the moment the drag crossed a card boundary it kicked
  // off a full synchronous re-render of the entire section — all fifteen cards,
  // their controls and every closure — from inside the pointermove handler,
  // several times per gesture and outside the rAF loop. That is what made the
  // carousel read as a slideshow.
  const lastSyncedRef = useRef(-1);

  const syncActiveIndex = useCallback(() => {
    const centre = ((Math.round(targetRef.current) % count) + count) % count;
    if (centre === lastSyncedRef.current) return;
    lastSyncedRef.current = centre;
    setActiveIndex(centre);
  }, [count]);

  // Read by the rAF loop through a ref so `wake` doesn't depend on it — a new
  // `wake` identity would tear down and restart the loop mid-drag.
  const syncActiveIndexRef = useRef(syncActiveIndex);
  useEffect(() => {
    syncActiveIndexRef.current = syncActiveIndex;
  }, [syncActiveIndex]);

  // Position every card by its (wrapped) distance from the focused centre.
  const applyCards = useCallback(() => {
    const f = focusRef.current;
    const intro = introRef.current;
    const refs = cardRefs.current;
    const lastZ = lastZRef.current;
    const lastPe = lastPeRef.current;
    const lastDepth = lastDepthRef.current;
    const lastCenter = lastCenterRef.current;
    const hudEls = hudElsRef.current;
    const hudOwner = hudOwnerRef.current;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const d = wrapDelta(i - f, count);
      const ad = Math.min(Math.abs(d), MAX_VISUAL_DISTANCE);
      const scale = Math.max(0.62, 1 - ad * scaleStep);
      // Tilt uses a signed, tightly-clamped distance so cards angle toward the
      // centre (left cards face right, right cards face left), classic coverflow.
      const sd = clamp(d, -MAX_TILT_DISTANCE, MAX_TILT_DISTANCE);
      const rotY = -sd * tilt;
      const tz = -ad * depth;
      // Intro folds the row in from a collapsed, slightly-sunken stack.
      const x = d * spread * intro;
      const lift = (1 - intro) * 26;

      // Compositor-only — safe to write every frame.
      el.style.transform =
        `translate3d(${x}px, ${lift}px, ${tz}px) ` +
        `rotateY(${rotY}deg) scale(${scale * (0.92 + 0.08 * intro)})`;
      el.style.opacity = String(Math.max(0, 1 - ad * opacityStep) * intro);

      // Depth/emphasis vars consumed by the HUD frame overlays (opacity only, so
      // they stay compositor-cheap). Side cards darken; the centre card glows.
      // Rounded to 1/100 and written only on change to avoid needless recalcs,
      // and written to the overlay roots rather than the card (see hudElsRef).
      const depthVar = Math.round(Math.min(ad * 0.3, 0.6) * 100) / 100;
      const centreVar = Math.round(Math.max(0, 1 - ad) * 100) / 100;
      if (lastDepth[i] !== depthVar || lastCenter[i] !== centreVar) {
        if (hudOwner[i] !== el) {
          hudEls[i] = Array.from(
            el.querySelectorAll<HTMLElement>("[data-hud]"),
          );
          hudOwner[i] = el;
        }
        const targets = hudEls[i];
        if (targets) {
          for (let h = 0; h < targets.length; h++) {
            if (lastDepth[i] !== depthVar) {
              targets[h].style.setProperty("--cf-depth", String(depthVar));
            }
            if (lastCenter[i] !== centreVar) {
              targets[h].style.setProperty("--cf-center", String(centreVar));
            }
          }
        }
        lastDepth[i] = depthVar;
        lastCenter[i] = centreVar;
      }

      // Recalc-triggering — only write when changed.
      const z = 1000 - Math.round(Math.abs(d) * 10);
      if (lastZ[i] !== z) {
        el.style.zIndex = String(z);
        lastZ[i] = z;
      }
      const pe: "auto" | "none" =
        intro < 0.6 || 1 - ad * opacityStep < 0.1 ? "none" : "auto";
      if (lastPe[i] !== pe) {
        el.style.pointerEvents = pe;
        lastPe[i] = pe;
      }
    }
  }, [count, spread, scaleStep, opacityStep, tilt, depth]);

  // GPU-promote the cards only while the loop is actively animating; demote at
  // rest so we don't hold a compositing layer per card while idle.
  const setCardsWillChange = useCallback((value: string) => {
    const refs = cardRefs.current;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (el) el.style.willChange = value;
    }
  }, []);

  const wake = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();
    setCardsWillChange("transform, opacity");
    const step = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = now;

      // Ease the intro alongside focus so the fan-in and any drag share a frame.
      const introDiff = introTargetRef.current - introRef.current;
      if (Math.abs(introDiff) >= SETTLE_EPS) {
        introRef.current += introDiff * (1 - Math.exp(-dt / INTRO_TAU_MS));
      } else {
        introRef.current = introTargetRef.current;
      }

      const diff = targetRef.current - focusRef.current;
      if (draggingRef.current) {
        focusRef.current = targetRef.current;
        applyCards();
        // Once per frame, not once per pointermove.
        syncActiveIndexRef.current();
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      const focusSettled = Math.abs(diff) < SETTLE_EPS;
      const introSettled =
        Math.abs(introTargetRef.current - introRef.current) < SETTLE_EPS;
      if (focusSettled && introSettled) {
        focusRef.current = targetRef.current;
        applyCards();
        syncActiveIndexRef.current();
        runningRef.current = false;
        setCardsWillChange("");
        return;
      }
      if (!focusSettled) {
        focusRef.current += diff * (1 - Math.exp(-dt / TAU_MS));
      }
      applyCards();
      syncActiveIndexRef.current();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [applyCards, setCardsWillChange]);

  // Focus is a free float driven solely by manual input (drag/keys/click) + the
  // idle auto-advance — the looping renderer wraps it. Scroll doesn't drive
  // focus (no pinning).
  const setTarget = useCallback(() => {
    targetRef.current = manualRef.current;
    // Deliberately does NOT sync the React index here — the rAF loop does that
    // once per frame, so a burst of pointermove events can't schedule several
    // renders inside a single frame's input handling.
    wake();
  }, [wake]);

  // Bring a card to the centre via the shortest wrapped path.
  const centreOn = useCallback(
    (index: number) => {
      manualRef.current += wrapDelta(index - targetRef.current, count);
      setTarget();
    },
    [count, setTarget],
  );

  const next = useCallback(() => {
    if (disabledRef.current) return;
    manualRef.current += 1;
    setTarget();
  }, [setTarget]);

  const prev = useCallback(() => {
    if (disabledRef.current) return;
    manualRef.current -= 1;
    setTarget();
  }, [setTarget]);

  // Initial layout + keep layout correct on resize (spread may change).
  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Reduced-motion: skip the entrance, just present the row.
    if (reduceMotionRef.current) {
      introRef.current = 1;
      introTargetRef.current = 1;
    }
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyCards();
      });
    };
    applyCards();
    setTarget();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      setCardsWillChange("");
      window.removeEventListener("resize", onResize);
    };
  }, [applyCards, setTarget, setCardsWillChange]);

  // On-screen state for arrow-key gating, auto-advance, and the intro trigger.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        // Play the fan-in the first time the section is seen.
        if (entry.isIntersecting && introTargetRef.current === 0) {
          introTargetRef.current = 1;
          wake();
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [wake]);

  // Gentle idle auto-advance: only while in view, not interacting, not hovered,
  // not disabled, and never under reduced-motion. Signals "this is a draggable
  // carousel" without demanding input.
  useEffect(() => {
    if (!autoAdvanceMs) return;
    const id = setInterval(() => {
      if (
        reduceMotionRef.current ||
        disabledRef.current ||
        pausedRef.current ||
        !inViewRef.current ||
        draggingRef.current ||
        hoverRef.current ||
        introTargetRef.current === 0
      ) {
        return;
      }
      manualRef.current += 1;
      setTarget();
    }, autoAdvanceMs);
    return () => clearInterval(id);
  }, [autoAdvanceMs, setTarget]);

  // Arrow keys step one card.
  //
  // Both the members and projects carousels install this on `window`, so on a
  // tall viewport where both sections are on screen at once a single ArrowRight
  // used to advance BOTH. Claiming the press with a per-event marker means the
  // first in-view carousel to see it handles it and the others stand down.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabledRef.current || !inViewRef.current) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;

      const claimable = e as KeyboardEvent & { __coverflowClaimed?: boolean };
      if (claimable.__coverflowClaimed) return;
      claimable.__coverflowClaimed = true;

      e.preventDefault();
      if (e.key === "ArrowLeft") prev();
      else next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Drag via window listeners (so in-card clicks still fire); flings on release.
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabledRef.current) return;
      draggingRef.current = true;
      movedRef.current = false;
      downXRef.current = e.clientX;
      startManualRef.current = manualRef.current;
      velocityRef.current = 0;
      lastMoveXRef.current = e.clientX;
      lastMoveTRef.current = performance.now();

      const controller = new AbortController();
      dragAbortRef.current = controller;
      const { signal } = controller;

      window.addEventListener(
        "pointermove",
        (ev: PointerEvent) => {
          if (!draggingRef.current) return;
          const dx = ev.clientX - downXRef.current;
          if (Math.abs(dx) > DRAG_THRESHOLD) movedRef.current = true;
          manualRef.current = startManualRef.current - dx / spread;

          // Velocity in cards/ms, smoothed so one jittery sample can't dominate
          // the fling. Clock-based rather than per-event so it doesn't scale
          // with the pointer's report rate.
          const now = performance.now();
          velocityRef.current = accumulateVelocity(
            velocityRef.current,
            ev.clientX - lastMoveXRef.current,
            now - lastMoveTRef.current,
            spread,
          );
          lastMoveXRef.current = ev.clientX;
          lastMoveTRef.current = now;

          setTarget();
        },
        { signal },
      );

      window.addEventListener(
        "pointerup",
        () => {
          draggingRef.current = false;
          controller.abort();

          // Carry the gesture's momentum before snapping. Releasing used to
          // stop dead on the nearest card, which is most of why the carousel
          // felt like a slideshow rather than something with weight.
          centreOn(
            flingTarget(
              targetRef.current,
              velocityRef.current,
              performance.now() - lastMoveTRef.current,
            ),
          );
        },
        { signal },
      );
      wake();
    },
    [centreOn, setTarget, spread, wake],
  );

  useEffect(() => () => dragAbortRef.current?.abort(), []);

  const onCardClick = useCallback(
    (index: number) => {
      if (movedRef.current) return; // it was a drag
      const centre = ((Math.round(focusRef.current) % count) + count) % count;
      if (index === centre) {
        const el = cardRefs.current[index];
        if (el) onActivateRef.current?.(index, el);
      } else {
        centreOn(index);
      }
    },
    [count, centreOn],
  );

  const registerCard = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    [],
  );

  return {
    sectionRef,
    registerCard,
    onCardClick,
    next,
    prev,
    goTo: centreOn,
    activeIndex,
    count,
    stageHandlers: {
      onPointerDown,
      onPointerEnter: () => {
        hoverRef.current = true;
      },
      onPointerLeave: () => {
        hoverRef.current = false;
      },
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
