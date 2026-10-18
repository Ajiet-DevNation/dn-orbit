"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  accumulateVelocity,
  flingTarget,
  releaseVelocity,
} from "@/lib/coverflow-fling";
import { isSettled, stepSpring } from "@/lib/coverflow-spring";
import { lensTilt, lensX, thumbOpacity, thumbX } from "@/lib/lens-layout";

// ─── Looping lens carousel controller ─────────────────────────────────────────
// Drives the Oryzo-style lens carousel: a fixed centre "lens" shows one card at
// full size, and a strip of small thumbs runs out to both sides. One focus value
// moves both — the big card slides one lens-width per step, the thumbs one
// thumb-pitch per step — so an item reads as growing while it passes through the
// lens, and its photo tilts + zooms on the way (geometry in lib/lens-layout.ts).
// Indices wrap, so the lens is always flanked. Focus is driven by pointer drag +
// ◀ ▶ arrow keys + click-to-centre + a gentle idle auto-advance, all integrated
// by one rAF loop. Everything is imperative (transforms written straight to the
// element refs), so there are no per-frame React renders — the only React state
// is the centre index, surfaced for the position indicator.
//
// Shared by the Projects and Members sections. The consumer renders the big
// cards inside the lens and hands each back via `registerCard(i)`, renders the
// thumbs and hands each back via `registerThumb(i)`, spreads `stageHandlers` on
// the drag area, and reads `activeIndex` / `next` / `prev` / `goTo` for nav
// chrome. Tapping the centred card calls `onActivateCenter(i, el)`; tapping any
// other card or thumb centres it. An element marked [data-lens-tilt] inside a
// card (its photo) gets the tilt + zoom.

interface CoverflowOptions {
  count: number;
  /** Inner (clipped) lens width in px — the size of the centre card. */
  lensWidth: number;
  thumbWidth: number;
  /** Lens-to-thumb and thumb-to-thumb spacing in px. */
  gap?: number;
  /** Idle auto-advance period in ms (0 disables it). */
  autoAdvanceMs?: number;
  /** Freezes ONLY the idle auto-advance (drag/keys still work), e.g. while a
   *  card is flipped open for reading. Distinct from `disabled`. */
  paused?: boolean;
  /** When true, pointer/keys/auto-advance are ignored (e.g. a detail overlay is open). */
  disabled?: boolean;
  onActivateCenter?: (index: number, el: HTMLElement) => void;
}

const MAX_DT_MS = 50;
const DRAG_THRESHOLD = 5;
// Pointer travel per card, as a share of the lens width. Between the thumb pitch
// and the lens width, so a drag feels attached to whichever strip it started on.
const DRAG_SPAN = 0.5;
// A thumb this faint is off-stage: it stops being painted and stops being
// written to at all (see applyCards).
const MIN_VISIBLE_OPACITY = 0.005;
// Grace period after a manual gesture before the idle auto-advance may fire, so
// a just-finished drag is never immediately yanked onward.
const AUTO_ADVANCE_GRACE_MS = 1500;

// Shortest signed distance from a to b around a ring of `n` (so cards wrap and
// both sides stay populated).
function wrapDelta(d: number, n: number): number {
  let r = ((d % n) + n) % n;
  if (r > n / 2) r -= n;
  return r;
}

export function useCoverflow({
  count,
  lensWidth,
  thumbWidth,
  gap = 16,
  autoAdvanceMs = 0,
  paused = false,
  disabled = false,
  onActivateCenter,
}: CoverflowOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Last-written visibility / pointer-events / will-change per big card, plus
  // opacity per thumb. transform is compositor-only (cheap to rewrite each
  // frame), but these force a style recalc, so we only touch them when they
  // actually change — this is what keeps the drag buttery instead of steppy.
  const lastVisibleRef = useRef<boolean[]>([]);
  const lastPeRef = useRef<("auto" | "none")[]>([]);
  const lastWillChangeRef = useRef<string[]>([]);
  const lastThumbVisibleRef = useRef<boolean[]>([]);
  const lastThumbOpacityRef = useRef<number[]>([]);
  const lastThumbWillChangeRef = useRef<string[]>([]);
  // Last-written HUD vars per big card. Setting a custom property invalidates
  // the card's subtree style, so we only write when the rounded value changes.
  // Only the one or two cards inside the lens are ever written, so that cost is
  // bounded no matter how long the row is.
  const lastDepthRef = useRef<number[]>([]);
  const lastCenterRef = useRef<number[]>([]);
  // The [data-lens-tilt] photo inside each big card, resolved once per card
  // element and re-resolved only when the card's DOM node identity changes.
  const tiltElsRef = useRef<(HTMLElement | null)[]>([]);
  const tiltOwnerRef = useRef<(HTMLElement | null)[]>([]);
  const dragPx = Math.max(1, Math.round(lensWidth * DRAG_SPAN));

  // Motion state. `focus` is where the row IS (in cards), `target` where it is
  // headed, `velocity` how fast it is travelling (cards/second) — the spring in
  // lib/coverflow-spring integrates the three. Keeping a real velocity is what
  // lets a drag release hand its momentum over instead of stopping dead.
  const focusRef = useRef(0);
  const velocityRef = useRef(0);
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
  const lastInteractionRef = useRef(0);
  const dragAbortRef = useRef<AbortController | null>(null);
  // Gesture-velocity state — see onPointerDown.
  const dragVelocityRef = useRef(0);
  const lastMoveXRef = useRef(0);
  const lastMoveTRef = useRef(0);

  // Intro: how far the thumb strips have unfolded from under the lens (0 → 1).
  // Driven from outside by the section's scroll entrance (useLensEntrance via
  // `setIntro`), which also owns the reduced-motion path. Input waits for 1, so
  // nothing can be dragged while the lens is still forming.
  const introRef = useRef(0);
  const reduceMotionRef = useRef(false);

  // The only React state: the centre index (live, for the counter) and the
  // index the row actually came to rest on (for one-shot chrome like the
  // bracket power-on, which must not re-fire on every card a drag sweeps past).
  const [activeIndex, setActiveIndex] = useState(0);
  const [settledIndex, setSettledIndex] = useState(0);

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

  const centreIndex = useCallback(
    () => ((Math.round(targetRef.current) % count) + count) % count,
    [count],
  );

  const syncActiveIndex = useCallback(() => {
    const centre = centreIndex();
    if (centre === lastSyncedRef.current) return;
    lastSyncedRef.current = centre;
    setActiveIndex(centre);
  }, [centreIndex]);

  // Read by the rAF loop through refs so `wake` doesn't depend on them — a new
  // `wake` identity would tear down and restart the loop mid-drag.
  const syncActiveIndexRef = useRef(syncActiveIndex);
  useEffect(() => {
    syncActiveIndexRef.current = syncActiveIndex;
  }, [syncActiveIndex]);
  const centreIndexRef = useRef(centreIndex);
  useEffect(() => {
    centreIndexRef.current = centreIndex;
  }, [centreIndex]);

  // ── Per-frame layout ───────────────────────────────────────────────────────

  // Place every big card (inside the lens) and every thumb (either side of it)
  // by its wrapped distance from the focused centre.
  const applyCards = useCallback(() => {
    const f = focusRef.current;
    const intro = introRef.current;
    const reduce = reduceMotionRef.current;
    const dims = { lensWidth, thumbWidth, gap };
    // Hold a compositor layer only while the row is on screen — not per
    // animation, which would tear down and rebuild a layer on every advance.
    const willChange = inViewRef.current ? "transform" : "";
    // Thumbs wholly past the viewport edge are skipped like faded ones. Reading
    // innerWidth does not force layout.
    const viewHalf = window.innerWidth / 2 + thumbWidth;

    const cards = cardRefs.current;
    const lastVisible = lastVisibleRef.current;
    const lastPe = lastPeRef.current;
    const lastWillChange = lastWillChangeRef.current;
    const lastDepth = lastDepthRef.current;
    const lastCenter = lastCenterRef.current;
    const tiltEls = tiltElsRef.current;
    const tiltOwner = tiltOwnerRef.current;

    for (let i = 0; i < cards.length; i++) {
      const el = cards[i];
      if (!el) continue;
      const d = wrapDelta(i - f, count);
      const ad = Math.abs(d);

      // Outside the lens: hide once and skip every write until it comes back.
      if (ad >= 1) {
        if (lastVisible[i] !== false) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          el.style.willChange = "";
          lastVisible[i] = false;
          lastPe[i] = "none";
          lastWillChange[i] = "";
        }
        continue;
      }
      if (lastVisible[i] !== true) {
        el.style.visibility = "";
        lastVisible[i] = true;
      }
      if (lastWillChange[i] !== willChange) {
        el.style.willChange = willChange;
        lastWillChange[i] = willChange;
      }

      el.style.transform = `translate3d(${lensX(d, lensWidth)}px, 0, 0)`;

      if (tiltOwner[i] !== el) {
        tiltEls[i] = el.querySelector<HTMLElement>("[data-lens-tilt]");
        tiltOwner[i] = el;
      }
      const photo = tiltEls[i];
      if (photo) {
        const { deg, scale } = lensTilt(reduce ? 0 : d);
        photo.style.transform = `rotate(${deg}deg) scale(${scale})`;
      }

      // HUD vars (opacity-only consumers): the leaving card darkens, the
      // arriving one powers up as it reaches the middle.
      const depthVar = Math.round(Math.min(ad * 0.6, 0.6) * 100) / 100;
      const centreVar = Math.round((1 - ad) * 100) / 100;
      if (lastDepth[i] !== depthVar) {
        el.style.setProperty("--cf-depth", String(depthVar));
        lastDepth[i] = depthVar;
      }
      if (lastCenter[i] !== centreVar) {
        el.style.setProperty("--cf-center", String(centreVar));
        lastCenter[i] = centreVar;
      }

      const pe: "auto" | "none" = intro < 0.6 || ad > 0.5 ? "none" : "auto";
      if (lastPe[i] !== pe) {
        el.style.pointerEvents = pe;
        lastPe[i] = pe;
      }
    }

    const thumbs = thumbRefs.current;
    const lastThumbVisible = lastThumbVisibleRef.current;
    const lastThumbOpacity = lastThumbOpacityRef.current;
    const lastThumbWillChange = lastThumbWillChangeRef.current;

    for (let i = 0; i < thumbs.length; i++) {
      const el = thumbs[i];
      if (!el) continue;
      const d = wrapDelta(i - f, count);
      // Intro unfolds both strips outward from under the lens.
      const x = thumbX(d, dims) * intro;
      const rawOpacity = thumbOpacity(d, count) * intro;
      const offStage =
        rawOpacity <= MIN_VISIBLE_OPACITY ||
        Math.abs(x) - thumbWidth / 2 > viewHalf ||
        // Wholly tucked under the lens.
        Math.abs(x) + thumbWidth / 2 <= lensWidth / 2;

      if (offStage) {
        if (lastThumbVisible[i] !== false) {
          el.style.visibility = "hidden";
          el.style.willChange = "";
          lastThumbVisible[i] = false;
          lastThumbWillChange[i] = "";
        }
        continue;
      }
      if (lastThumbVisible[i] !== true) {
        el.style.visibility = "";
        lastThumbVisible[i] = true;
      }
      if (lastThumbWillChange[i] !== willChange) {
        el.style.willChange = willChange;
        lastThumbWillChange[i] = willChange;
      }

      el.style.transform = `translate3d(${x}px, 0, 0)`;
      const opacity = Math.round(rawOpacity * 100) / 100;
      if (lastThumbOpacity[i] !== opacity) {
        el.style.opacity = String(opacity);
        lastThumbOpacity[i] = opacity;
      }
    }
  }, [count, lensWidth, thumbWidth, gap]);

  const wake = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();

    const step = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = now;

      const previousFocus = focusRef.current;
      if (draggingRef.current) {
        // A drag tracks the pointer 1:1 — anything else feels like lag. Keep the
        // spring's velocity in sync with the gesture so an interrupted drag
        // (pointercancel, a lost capture) still releases with momentum.
        focusRef.current = targetRef.current;
        if (dt > 0) {
          velocityRef.current =
            ((focusRef.current - previousFocus) / dt) * 1000;
        }
      } else if (reduceMotionRef.current) {
        // Reduced motion: jump straight to the target, no glide.
        focusRef.current = targetRef.current;
        velocityRef.current = 0;
      } else {
        const next = stepSpring(
          { pos: focusRef.current, vel: velocityRef.current },
          targetRef.current,
          dt,
        );
        focusRef.current = next.pos;
        velocityRef.current = next.vel;
      }

      applyCards();
      // Once per frame, not once per pointermove.
      syncActiveIndexRef.current();

      if (draggingRef.current) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }

      const focusSettled = isSettled(
        { pos: focusRef.current, vel: velocityRef.current },
        targetRef.current,
      );
      if (focusSettled) {
        // Land exactly on the target rather than a hair short of it.
        focusRef.current = targetRef.current;
        velocityRef.current = 0;
        applyCards();
        syncActiveIndexRef.current();
        setSettledIndex(centreIndexRef.current());
        runningRef.current = false;
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [applyCards]);

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
    lastInteractionRef.current = performance.now();
    manualRef.current += 1;
    setTarget();
  }, [setTarget]);

  const prev = useCallback(() => {
    if (disabledRef.current) return;
    lastInteractionRef.current = performance.now();
    manualRef.current -= 1;
    setTarget();
  }, [setTarget]);

  // Initial layout + keep layout correct on resize (lens size may change).
  useEffect(() => {
    reduceMotionRef.current =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
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
      window.removeEventListener("resize", onResize);
    };
  }, [applyCards, setTarget]);

  // On-screen state for arrow-key gating, auto-advance and layer promotion.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          // Promote the visible cards now, before anything moves.
          applyCards();
          wake();
        } else {
          // Off screen: drop the layers and any ghost still fading.
          const drop = (els: (HTMLDivElement | null)[], last: string[]) => {
            for (let i = 0; i < els.length; i++) {
              const el = els[i];
              if (el && last[i]) {
                el.style.willChange = "";
                last[i] = "";
              }
            }
          };
          drop(cardRefs.current, lastWillChangeRef.current);
          drop(thumbRefs.current, lastThumbWillChangeRef.current);
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [applyCards, wake]);

  // Gentle idle auto-advance: only while in view, visible, not interacting, not
  // hovered, not disabled, and never under reduced-motion. Signals "this is a
  // draggable carousel" without demanding input.
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
        introRef.current < 1 ||
        // A background tab gets no rAF, so the loop cannot consume advances —
        // without this the row would silently queue up a pile of them and jump
        // on return.
        document.visibilityState !== "visible" ||
        performance.now() - lastInteractionRef.current < AUTO_ADVANCE_GRACE_MS
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
      if (disabledRef.current || !inViewRef.current || introRef.current < 1)
        return;
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
      if (disabledRef.current || introRef.current < 1) return;
      draggingRef.current = true;
      movedRef.current = false;
      downXRef.current = e.clientX;
      startManualRef.current = manualRef.current;
      dragVelocityRef.current = 0;
      lastMoveXRef.current = e.clientX;
      lastMoveTRef.current = performance.now();
      lastInteractionRef.current = lastMoveTRef.current;

      const controller = new AbortController();
      dragAbortRef.current = controller;
      const { signal } = controller;

      window.addEventListener(
        "pointermove",
        (ev: PointerEvent) => {
          if (!draggingRef.current) return;
          const dx = ev.clientX - downXRef.current;
          if (Math.abs(dx) > DRAG_THRESHOLD) movedRef.current = true;
          manualRef.current = startManualRef.current - dx / dragPx;

          // Velocity in cards/ms, smoothed so one jittery sample can't dominate
          // the fling. Clock-based rather than per-event so it doesn't scale
          // with the pointer's report rate.
          const now = performance.now();
          dragVelocityRef.current = accumulateVelocity(
            dragVelocityRef.current,
            ev.clientX - lastMoveXRef.current,
            now - lastMoveTRef.current,
            dragPx,
          );
          lastMoveXRef.current = ev.clientX;
          lastMoveTRef.current = now;

          setTarget();
        },
        { signal },
      );

      const endDrag = () => {
        if (!draggingRef.current) return;
        draggingRef.current = false;
        controller.abort();
        const now = performance.now();
        lastInteractionRef.current = now;

        // Hand the gesture's momentum to the settle spring, then aim at the
        // card that momentum was heading for. Releasing used to stop dead on
        // the nearest card, which is most of why the carousel felt like a
        // slideshow rather than something with weight.
        const sinceMove = now - lastMoveTRef.current;
        velocityRef.current =
          releaseVelocity(dragVelocityRef.current, sinceMove) * 1000;
        centreOn(
          flingTarget(targetRef.current, dragVelocityRef.current, sinceMove),
        );
      };

      window.addEventListener("pointerup", endDrag, { signal });
      // Alt-tabbing mid-drag takes the pointer away without ever delivering an
      // up or a cancel; the loop would then spin forever, tracking a pointer
      // that no longer exists.
      window.addEventListener("blur", endDrag, { signal });
      // A cancelled gesture (the browser taking over for a scroll, the pointer
      // being lost) never fires pointerup — without this the row would stay
      // stuck in drag mode, tracking nothing.
      window.addEventListener("pointercancel", endDrag, { signal });
      wake();
    },
    [centreOn, setTarget, dragPx, wake],
  );

  useEffect(() => () => dragAbortRef.current?.abort(), []);

  const onCardClick = useCallback(
    (index: number) => {
      if (movedRef.current) return; // it was a drag
      lastInteractionRef.current = performance.now();
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

  // Entrance hook → thumb strips. Applied at once (no loop needed: the caller
  // already runs on its own rAF), so the strips track the scroll frame-exact.
  const setIntro = useCallback(
    (value: number) => {
      if (introRef.current === value) return;
      introRef.current = value;
      applyCards();
    },
    [applyCards],
  );

  // One stable setter per index, cached.
  //
  // `registerCard(i)` used to build a fresh closure on every render, so React
  // saw a new ref callback each time and detached-then-reattached every card
  // ref on EVERY re-render — including the ones a drag triggers as it crosses
  // card boundaries, i.e. exactly when the frame budget was tightest.
  const cardSettersRef = useRef<((el: HTMLDivElement | null) => void)[]>([]);
  const registerCard = useCallback((index: number) => {
    const cached = cardSettersRef.current[index];
    if (cached) return cached;
    const setter = (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    };
    cardSettersRef.current[index] = setter;
    return setter;
  }, []);
  const thumbSettersRef = useRef<((el: HTMLDivElement | null) => void)[]>([]);
  const registerThumb = useCallback((index: number) => {
    const cached = thumbSettersRef.current[index];
    if (cached) return cached;
    const setter = (el: HTMLDivElement | null) => {
      thumbRefs.current[index] = el;
    };
    thumbSettersRef.current[index] = setter;
    return setter;
  }, []);

  return {
    sectionRef,
    registerCard,
    registerThumb,
    onCardClick,
    next,
    prev,
    goTo: centreOn,
    setIntro,
    activeIndex,
    settledIndex,
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
