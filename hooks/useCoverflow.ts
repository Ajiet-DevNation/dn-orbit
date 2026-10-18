"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lensTilt, lensX, thumbX } from "@/lib/lens-layout";

// ─── Lens carousel renderer ───────────────────────────────────────────────────
// Renders the oryzo-style lens carousel: a fixed centre "lens" shows one card at
// full size, and a strip of small thumbs runs out to both sides. One focus value
// moves both — the big card slides one lens-width per step, the thumbs one
// thumb-pitch per step — so an item reads as growing while it passes through the
// lens, and its photo tilts + zooms on the way (geometry in lib/lens-layout.ts).
// No loop, like oryzo: the left strip is empty on the first card, the right on
// the last.
//
// Focus is driven from outside — the page scroll, via useLensScroll calling
// `setFocus` — so this hook owns no motion of its own. Everything is written
// imperatively to the element refs; the only React state is the centre index
// (for the counter) and the index the row last came to rest on (for one-shot
// chrome like the bracket power-on).
//
// Shared by the Projects and Members sections. The consumer renders the big
// cards inside the lens (`registerCard(i)`) and the thumbs (`registerThumb(i)`),
// and reads `activeIndex` / `next` / `prev` for nav chrome. Navigation goes
// through `navigateRef`, which the scroll hook points at "scroll the page to that
// card" (default: jump straight there). Tapping the centred card calls
// `onActivateCenter(i, el)`; tapping any other card or thumb navigates to it. An
// element marked [data-lens-tilt] inside a card (its photo) gets the tilt + zoom.

interface CoverflowOptions {
  count: number;
  /** Inner (clipped) lens width in px — the size of the centre card. */
  lensWidth: number;
  thumbWidth: number;
  /** Lens-to-thumb and thumb-to-thumb spacing in px. */
  gap?: number;
  /** When true, keys are ignored (e.g. a detail overlay is open). */
  disabled?: boolean;
  onActivateCenter?: (index: number, el: HTMLElement) => void;
}

/** Focus within this of a whole card counts as resting on it. */
const REST_EPS = 0.001;

export function useCoverflow({
  count,
  lensWidth,
  thumbWidth,
  gap = 16,
  disabled = false,
  onActivateCenter,
}: CoverflowOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  // Last-written visibility / pointer-events / will-change per big card and per
  // thumb. transform is compositor-only (cheap to rewrite each frame), but these
  // force a style recalc, so we only touch them when they actually change.
  const lastVisibleRef = useRef<boolean[]>([]);
  const lastPeRef = useRef<("auto" | "none")[]>([]);
  const lastWillChangeRef = useRef<string[]>([]);
  const lastThumbVisibleRef = useRef<boolean[]>([]);
  const lastThumbOpacityRef = useRef<number[]>([]);
  const lastThumbWillChangeRef = useRef<string[]>([]);
  // Last-written HUD vars per big card, written only when the rounded value
  // changes (a custom property invalidates the card's subtree style).
  const lastDepthRef = useRef<number[]>([]);
  const lastCenterRef = useRef<number[]>([]);
  // The [data-lens-tilt] photo inside each big card, resolved once per card
  // element and re-resolved only when the card's DOM node identity changes.
  const tiltElsRef = useRef<(HTMLElement | null)[]>([]);
  const tiltOwnerRef = useRef<(HTMLElement | null)[]>([]);

  // Where the row is (in cards) and how far the thumb strips have unfolded
  // (0 → 1). Both are set from outside by the section's scroll hook, which also
  // owns the reduced-motion path. Input waits for intro 1, so nothing can be
  // clicked through while the lens is still forming.
  const focusRef = useRef(0);
  const introRef = useRef(0);
  const inViewRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [settledIndex, setSettledIndex] = useState(0);
  const lastActiveRef = useRef(0);
  const lastSettledRef = useRef(0);

  const disabledRef = useRef(disabled);
  const onActivateRef = useRef(onActivateCenter);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    onActivateRef.current = onActivateCenter;
  }, [onActivateCenter]);

  // ── Per-frame layout ───────────────────────────────────────────────────────

  // Place every big card (inside the lens) and every thumb (either side of it)
  // by its distance from the focused card.
  const applyCards = useCallback(() => {
    const f = focusRef.current;
    const intro = introRef.current;
    const reduce = reduceMotionRef.current;
    const dims = { lensWidth, thumbWidth, gap };
    // Hold a compositor layer only while the row is on screen.
    const willChange = inViewRef.current ? "transform" : "";
    // Thumbs wholly past the viewport edge are skipped. Reading innerWidth
    // does not force layout.
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
      const d = i - f;
      const ad = Math.abs(d);

      if (tiltOwner[i] !== el) {
        tiltEls[i] = el.querySelector<HTMLElement>("[data-lens-tilt]");
        tiltOwner[i] = el;
      }
      const photo = tiltEls[i];

      // Outside the lens: hide once and skip every write until it comes back.
      if (ad >= 1) {
        if (lastVisible[i] !== false) {
          el.style.visibility = "hidden";
          el.style.pointerEvents = "none";
          el.style.willChange = "";
          if (photo) photo.style.willChange = "";
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
        // The tilting photo gets its own layer too. Without it every scroll
        // frame re-painted the whole picture area (the project cards' dot
        // grid, giant watermark and chips) — why Projects ran heavier than
        // Members.
        if (photo) photo.style.willChange = willChange;
        lastWillChange[i] = willChange;
      }

      el.style.transform = `translate3d(${lensX(d, lensWidth)}px, 0, 0)`;

      if (photo) {
        const { deg, scale } = lensTilt(reduce ? 0 : d);
        photo.style.transform = `rotate(${deg}deg) scale(${scale})`;
      }

      // HUD vars: the card holding the centre is lit, the other one dimmed.
      // Flipped once per pass rather than scrubbed per frame — each change
      // re-painted the card, so the frame chrome (HudCardFrame) eases the
      // flip with a CSS opacity transition, which runs on the compositor.
      const lit = ad < 0.5;
      const depthVar = lit ? 0 : 0.6;
      const centreVar = lit ? 1 : 0;
      if (lastDepth[i] !== depthVar) {
        el.style.setProperty("--cf-depth", String(depthVar));
        lastDepth[i] = depthVar;
      }
      if (lastCenter[i] !== centreVar) {
        el.style.setProperty("--cf-center", String(centreVar));
        lastCenter[i] = centreVar;
      }

      const pe: "auto" | "none" = intro < 1 || ad > 0.5 ? "none" : "auto";
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
      const d = i - f;
      // Intro unfolds both strips outward from under the lens.
      const x = thumbX(d, dims) * intro;
      const offStage =
        intro <= 0 ||
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
      const opacity = Math.round(intro * 100) / 100;
      if (lastThumbOpacity[i] !== opacity) {
        el.style.opacity = String(opacity);
        lastThumbOpacity[i] = opacity;
      }
    }
  }, [lensWidth, thumbWidth, gap]);

  // Scroll hook → row position. Also publishes the centre index (live, for the
  // counter) and the index the row rests on (for the bracket power-on), each
  // only when it actually changes.
  const setFocus = useCallback(
    (value: number) => {
      focusRef.current = value;
      applyCards();
      const centre = Math.max(0, Math.min(count - 1, Math.round(value)));
      if (centre !== lastActiveRef.current) {
        lastActiveRef.current = centre;
        setActiveIndex(centre);
      }
      if (
        Math.abs(value - centre) < REST_EPS &&
        centre !== lastSettledRef.current
      ) {
        lastSettledRef.current = centre;
        setSettledIndex(centre);
      }
    },
    [applyCards, count],
  );

  // Scroll hook → thumb strips.
  const setIntro = useCallback(
    (value: number) => {
      if (introRef.current === value) return;
      introRef.current = value;
      applyCards();
    },
    [applyCards],
  );

  // How to bring card k to the centre. The scroll hook replaces this with a
  // page scroll; until then (and with no pin) it jumps.
  const navigateRef = useRef<(index: number) => void>((index) =>
    setFocus(index),
  );

  const go = useCallback(
    (index: number) => {
      if (disabledRef.current || introRef.current < 1) return;
      navigateRef.current(Math.max(0, Math.min(count - 1, index)));
    },
    [count],
  );
  const next = useCallback(() => go(lastActiveRef.current + 1), [go]);
  const prev = useCallback(() => go(lastActiveRef.current - 1), [go]);

  // Initial layout + keep layout correct on resize (lens size may change).
  useEffect(() => {
    reduceMotionRef.current = !!window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        applyCards();
      });
    };
    applyCards();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, [applyCards]);

  // On-screen state for arrow-key gating and layer promotion.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
        if (entry.isIntersecting) {
          applyCards();
        } else {
          // Off screen: drop the compositor layers.
          const drop = (els: (HTMLDivElement | null)[], last: string[]) => {
            for (let i = 0; i < els.length; i++) {
              const card = els[i];
              if (card && last[i]) {
                card.style.willChange = "";
                last[i] = "";
              }
            }
          };
          drop(cardRefs.current, lastWillChangeRef.current);
          drop(thumbRefs.current, lastThumbWillChangeRef.current);
          for (const photo of tiltElsRef.current) {
            if (photo) photo.style.willChange = "";
          }
        }
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [applyCards]);

  // Arrow keys step one card.
  //
  // Both carousels install this on `window`; claiming the press with a
  // per-event marker means only the first in-view carousel handles it.
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

  const onCardClick = useCallback(
    (index: number) => {
      if (introRef.current < 1) return;
      const centre = Math.round(focusRef.current);
      if (index === centre) {
        const el = cardRefs.current[index];
        if (el) onActivateRef.current?.(index, el);
      } else {
        go(index);
      }
    },
    [go],
  );

  // One stable setter per index, cached — a fresh closure per render would make
  // React detach and reattach every card ref on every re-render.
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
    activeIndex,
    settledIndex,
    count,
    setIntro,
    setFocus,
    navigateRef,
  };
}
