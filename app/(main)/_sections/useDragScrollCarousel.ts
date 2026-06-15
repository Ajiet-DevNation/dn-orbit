"use client";

import { useCallback, useEffect, useRef } from "react";

// ─── Scroll-linked, draggable horizontal carousel ────────────────────────────
// A reusable controller for the Projects and Members carousels. As the pinned
// section is scrolled through, the track glides sideways (scroll → base offset);
// pointer-drag and ◀ ▶ arrow keys layer a manual offset on top. Everything is
// driven imperatively (refs + a single rAF easing loop) so there are no
// per-frame React renders — the same glitch-free approach as AnnouncementCarousel.
//
// Dragging uses window-level pointer listeners (not setPointerCapture) so that
// clicks on elements *inside* the cards — e.g. a member's social links — still
// fire normally; capture would retarget those clicks to the viewport. Consumers
// drive open/flip from a card's own onClick, guarded by `didDrag()` so a drag
// never counts as a tap.

interface CarouselOptions {
  /** One arrow-key / drag-snap advance, in px (card width + gap). */
  step: number;
  /** Map scroll through [start, end] of the scrub region (a settle at each end). */
  scrubStart?: number;
  scrubEnd?: number;
  /** When true, pointer/keys are ignored (e.g. a modal/overlay is open). */
  disabled?: boolean;
}

const TAU_MS = 90;
const MAX_DT_MS = 50;
const DRAG_THRESHOLD = 5;

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}
function clamp01(n: number): number {
  return clamp(n, 0, 1);
}

export function useDragScrollCarousel({
  step,
  scrubStart = 0.05,
  scrubEnd = 0.9,
  disabled = false,
}: CarouselOptions) {
  const sectionRef = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  const offsetRef = useRef(0);
  const targetRef = useRef(0);
  const manualRef = useRef(0); // drag / arrow-key offset layered on the scroll
  const maxScrollRef = useRef(0);
  const draggingRef = useRef(false);
  const downXRef = useRef(0);
  const startManualRef = useRef(0);
  const movedRef = useRef(false);
  const inViewRef = useRef(false);
  const runningRef = useRef(false);
  const rafRef = useRef(0);
  const lastTimeRef = useRef(0);

  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  const apply = () => {
    if (trackRef.current) {
      trackRef.current.style.transform = `translate3d(${-offsetRef.current}px,0,0)`;
    }
  };

  const wake = useCallback(() => {
    if (runningRef.current) return;
    runningRef.current = true;
    lastTimeRef.current = performance.now();
    const stepFrame = (now: number) => {
      const dt = Math.min(now - lastTimeRef.current, MAX_DT_MS);
      lastTimeRef.current = now;
      const diff = targetRef.current - offsetRef.current;
      if (draggingRef.current) {
        offsetRef.current = targetRef.current; // 1:1 follow while dragging
        apply();
        rafRef.current = requestAnimationFrame(stepFrame);
        return;
      }
      if (Math.abs(diff) < 0.5) {
        offsetRef.current = targetRef.current;
        apply();
        runningRef.current = false;
        return;
      }
      offsetRef.current += diff * (1 - Math.exp(-dt / TAU_MS));
      apply();
      rafRef.current = requestAnimationFrame(stepFrame);
    };
    rafRef.current = requestAnimationFrame(stepFrame);
  }, []);

  const scrollOffset = useCallback(() => {
    const el = sectionRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const scrub = rect.height - window.innerHeight;
    const raw = scrub > 0 ? -rect.top / scrub : rect.top <= 0 ? 1 : 0;
    const p = clamp01((raw - scrubStart) / (scrubEnd - scrubStart));
    return p * maxScrollRef.current;
  }, [scrubStart, scrubEnd]);

  // Combine scroll + manual, clamp, and re-normalise the manual layer so it can
  // never push past the ends (no dead zone when dragging at a limit).
  const setTarget = useCallback(() => {
    const base = scrollOffset();
    const clamped = clamp(base + manualRef.current, 0, maxScrollRef.current);
    manualRef.current = clamped - base;
    targetRef.current = clamped;
    wake();
  }, [scrollOffset, wake]);

  const measure = useCallback(() => {
    const vp = viewportRef.current;
    const track = trackRef.current;
    if (!vp || !track) return;
    maxScrollRef.current = Math.max(0, track.scrollWidth - vp.clientWidth);
    setTarget();
  }, [setTarget]);

  // Scroll / resize → recompute target.
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setTarget();
      });
    };
    const onResize = () => measure();
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      runningRef.current = false;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [measure, setTarget]);

  // Track on-screen state so arrow keys only act when the carousel is visible.
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

  // Arrow-key navigation.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (disabledRef.current || !inViewRef.current) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        manualRef.current -= step;
        setTarget();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        manualRef.current += step;
        setTarget();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, setTarget]);

  // ── Dragging via window listeners (so in-card clicks still fire) ──
  // The move/up listeners are scoped to one drag via an AbortController, so they
  // tear themselves down on pointerup without a self-referencing handler.
  const dragAbortRef = useRef<AbortController | null>(null);

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
          manualRef.current = startManualRef.current - dx;
          setTarget();
        },
        { signal }
      );
      window.addEventListener(
        "pointerup",
        () => {
          draggingRef.current = false;
          controller.abort();
        },
        { signal }
      );

      wake();
    },
    [setTarget, wake]
  );

  // Tear down any in-flight drag listeners on unmount.
  useEffect(() => {
    return () => dragAbortRef.current?.abort();
  }, []);

  // True if the last interaction was a drag (so consumers can ignore the click).
  const didDrag = useCallback(() => movedRef.current, []);

  return {
    sectionRef,
    viewportRef,
    trackRef,
    onPointerDown,
    didDrag,
  };
}
