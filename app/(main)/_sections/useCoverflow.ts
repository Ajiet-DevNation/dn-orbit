"use client";

import { useCallback, useEffect, useRef } from "react";

// ─── Looping coverflow controller ─────────────────────────────────────────────
// Drives a focus-based coverflow: the centred card is full-size and on top; its
// neighbours recede behind it (scaled, dimmed, overlapping) on BOTH sides — the
// indices wrap, so the centre is always flanked. Focus is driven by scroll
// position + pointer drag + ◀ ▶ arrow keys + click-to-centre, eased by one rAF
// loop. Everything is imperative (transforms written straight to the card refs),
// so there are no per-frame React renders.
//
// Shared by the Projects and Members sections. The consumer renders the cards,
// hands each one back via `registerCard(i)`, spreads `stageHandlers` on the drag
// area, and `cardHandlers(i)` on each card. Tapping the centred card calls
// `onActivateCenter(i, el)`; tapping any other card brings it to the centre.

interface CoverflowOptions {
  count: number;
  /** Horizontal centre-to-centre gap in px (< card width → cards overlap). */
  spread: number;
  scaleStep?: number;
  opacityStep?: number;
  /** When true, pointer/keys are ignored (e.g. a detail overlay is open). */
  disabled?: boolean;
  onActivateCenter?: (index: number, el: HTMLElement) => void;
}

const TAU_MS = 110;
const MAX_DT_MS = 50;
const DRAG_THRESHOLD = 5;
const MAX_VISUAL_DISTANCE = 3.5;

// Shortest signed distance from a to b around a ring of `n` (so cards wrap and
// both sides stay populated).
function wrapDelta(d: number, n: number): number {
  let r = ((d % n) + n) % n;
  if (r > n / 2) r -= n;
  return r;
}

export function useCoverflow({
  count,
  spread,
  scaleStep = 0.12,
  opacityStep = 0.32,
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

  const focusRef = useRef(0);
  const targetRef = useRef(0);
  const manualRef = useRef(0);
  const draggingRef = useRef(false);
  const downXRef = useRef(0);
  const startManualRef = useRef(0);
  const movedRef = useRef(false);
  const inViewRef = useRef(false);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);
  const dragAbortRef = useRef<AbortController | null>(null);

  const disabledRef = useRef(disabled);
  const onActivateRef = useRef(onActivateCenter);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);
  useEffect(() => {
    onActivateRef.current = onActivateCenter;
  }, [onActivateCenter]);

  // Position every card by its (wrapped) distance from the focused centre.
  const applyCards = useCallback(() => {
    const f = focusRef.current;
    const refs = cardRefs.current;
    const lastZ = lastZRef.current;
    const lastPe = lastPeRef.current;
    for (let i = 0; i < refs.length; i++) {
      const el = refs[i];
      if (!el) continue;
      const d = wrapDelta(i - f, count);
      const ad = Math.min(Math.abs(d), MAX_VISUAL_DISTANCE);
      // Compositor-only — safe to write every frame.
      el.style.transform = `translateX(${d * spread}px) scale(${Math.max(
        0.62,
        1 - ad * scaleStep
      )})`;
      el.style.opacity = String(Math.max(0, 1 - ad * opacityStep));

      // Recalc-triggering — only write when changed.
      const z = 1000 - Math.round(Math.abs(d) * 10);
      if (lastZ[i] !== z) {
        el.style.zIndex = String(z);
        lastZ[i] = z;
      }
      const pe: "auto" | "none" = 1 - ad * opacityStep < 0.1 ? "none" : "auto";
      if (lastPe[i] !== pe) {
        el.style.pointerEvents = pe;
        lastPe[i] = pe;
      }
    }
  }, [count, spread, scaleStep, opacityStep]);

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
    setCardsWillChange("transform");
    const step = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = now;
      const diff = targetRef.current - focusRef.current;
      if (draggingRef.current) {
        focusRef.current = targetRef.current;
        applyCards();
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      if (Math.abs(diff) < 0.001) {
        focusRef.current = targetRef.current;
        applyCards();
        runningRef.current = false;
        setCardsWillChange("");
        return;
      }
      focusRef.current += diff * (1 - Math.exp(-dt / TAU_MS));
      applyCards();
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }, [applyCards, setCardsWillChange]);

  // Focus is a free float driven solely by manual input (drag/keys/click) — the
  // looping renderer wraps it. Scroll no longer drives focus (no pinning).
  const setTarget = useCallback(() => {
    targetRef.current = manualRef.current;
    wake();
  }, [wake]);

  // Bring a card to the centre via the shortest wrapped path.
  const centreOn = useCallback(
    (index: number) => {
      manualRef.current += wrapDelta(index - targetRef.current, count);
      setTarget();
    },
    [count, setTarget]
  );

  // Initial layout + keep layout correct on resize (spread may change — Phase 4).
  useEffect(() => {
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

  // On-screen state for arrow-key gating.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry.isIntersecting;
      },
      { threshold: 0 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Arrow keys step one card.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabledRef.current || !inViewRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        manualRef.current -= 1;
        setTarget();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        manualRef.current += 1;
        setTarget();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setTarget]);

  // Drag via window listeners (so in-card clicks still fire); snaps on release.
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (disabledRef.current) return;
      draggingRef.current = true;
      movedRef.current = false;
      downXRef.current = e.clientX;
      startManualRef.current = manualRef.current;
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
          setTarget();
        },
        { signal }
      );
      window.addEventListener(
        "pointerup",
        () => {
          draggingRef.current = false;
          controller.abort();
          centreOn(Math.round(targetRef.current)); // snap to nearest card
        },
        { signal }
      );
      wake();
    },
    [centreOn, setTarget, spread, wake]
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
    [count, centreOn]
  );

  const registerCard = useCallback(
    (index: number) => (el: HTMLDivElement | null) => {
      cardRefs.current[index] = el;
    },
    []
  );

  return {
    sectionRef,
    registerCard,
    onCardClick,
    stageHandlers: {
      onPointerDown,
      onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    },
  };
}
