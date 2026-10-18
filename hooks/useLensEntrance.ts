"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  arrivalProgress,
  dissolveAt,
  entranceFrame,
  entranceProgress,
  viewfinderSize,
} from "@/lib/lens-entrance";

// Scroll-scrubbed entrance for the lens sections (choreography in
// lib/lens-entrance.ts). Progress comes straight from the section's live rect
// every frame, so content above changing height (event search, leaderboard
// pages) can never leave it out of step the way cached trigger offsets can.
// A short exponential follow smooths wheel steps into a scrub.
//
// Everything is written imperatively to refs — no React renders per frame. The
// global CSS reset can't flatten a rAF loop, so reduced motion takes its own
// path: no listeners, the finished state written once (the section also drops
// its pin via motion-reduce: classes).

/** Follow time constant for the scrub, ms. */
const SMOOTH_TAU_MS = 90;
const MAX_DT_MS = 50;
const DONE_EPS = 0.0005;
/** Giant title starts this share of the viewport width to the right. */
const GIANT_SLIDE_SHARE = 0.6;

interface EntranceOptions {
  sectionRef: React.RefObject<HTMLElement | null>;
  lensWidth: number;
  lensHeight: number;
  /** Frame border + inner gap around the lens, px. */
  pad: number;
  /** Drives the thumb strips (useCoverflow's setIntro). */
  setIntro: (value: number) => void;
}

export function useLensEntrance({
  sectionRef,
  lensWidth,
  lensHeight,
  pad,
  setIntro,
}: EntranceOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const giantRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  // Read through a ref so a new callback identity can't restart the loop.
  const setIntroRef = useRef(setIntro);
  useEffect(() => {
    setIntroRef.current = setIntro;
  }, [setIntro]);

  // Layout effect: the first frame is written before paint, so a resize never
  // flashes the JSX defaults.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const content = contentRef.current;
    const giant = giantRef.current;
    const heading = headingRef.current;
    if (!section || !stage || !frame || !content || !giant || !heading) return;

    const cells = Array.from(coverRef.current?.children ?? []) as HTMLElement[];
    const cellHidden: boolean[] = [];
    let lastT = Number.NaN;
    let lastBlur = -1;

    // One scalar timeline: t in [-1, 0) is the arrival (section rising into
    // view), [0, 1] the pinned entrance. Smoothing a single value keeps the two
    // phases continuous across the moment the section sticks.
    const apply = (t: number) => {
      if (t === lastT) return;
      lastT = t;
      const f = entranceFrame(Math.max(0, t), Math.min(1, 1 + t));

      // Reads first (layout), then writes, so each frame forces at most one
      // layout. The flight target is measured live while it is in use.
      let dx = 0;
      let dy = 0;
      let flyScale = 1;
      if (f.fly > 0) {
        const title = heading.querySelector("h2") ?? heading;
        const target = title.getBoundingClientRect();
        const origin = stage.getBoundingClientRect();
        dx = target.left + target.width / 2 - (origin.left + origin.width / 2);
        dy = target.top + target.height / 2 - (origin.top + origin.height / 2);
        flyScale = target.width / Math.max(1, giant.offsetWidth);
      }

      const box = viewfinderSize(f.open, lensWidth, lensHeight);
      frame.style.width = `${box.width + pad * 2}px`;
      frame.style.height = `${box.height + pad * 2}px`;

      for (let i = 0; i < cells.length; i++) {
        const hidden = f.dissolve > dissolveAt(i);
        if (cellHidden[i] !== hidden) {
          cells[i].style.visibility = hidden ? "hidden" : "";
          cellHidden[i] = hidden;
        }
      }
      // A filter keeps its own compositing layer; drop it entirely once sharp.
      const blur = Math.round(f.blur * 10) / 10;
      if (blur !== lastBlur) {
        content.style.filter = blur > 0 ? `blur(${blur}px)` : "";
        lastBlur = blur;
      }

      const slide = (1 - f.giantIn) * window.innerWidth * GIANT_SLIDE_SHARE;
      const scale = 1 + (flyScale - 1) * f.fly;
      giant.style.transform =
        `translate(-50%, -50%) translate3d(${slide + dx * f.fly}px, ` +
        `${dy * f.fly}px, 0) scale(${scale})`;
      giant.style.opacity = String(f.giantOpacity);
      giant.style.visibility = f.giantOpacity > 0 ? "" : "hidden";
      heading.style.opacity = String(f.heading);

      if (reticleRef.current)
        reticleRef.current.style.opacity = String(f.reticle);
      if (hintRef.current) hintRef.current.style.opacity = String(f.hint);
      if (floorRef.current) floorRef.current.style.opacity = String(f.chrome);
      if (chromeRef.current) {
        chromeRef.current.style.opacity = String(f.chrome);
        chromeRef.current.style.visibility = f.chrome > 0 ? "" : "hidden";
      }

      setIntroRef.current(f.thumbs);
    };

    const read = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      return r.top > 0
        ? arrivalProgress(r.top, vh) - 1
        : entranceProgress(r.top, r.height, vh);
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      apply(1);
      return;
    }

    let current = read();
    let raf = 0;
    let last = 0;
    apply(current);

    const tick = (now: number) => {
      const dt = Math.min(now - last, MAX_DT_MS);
      last = now;
      const target = read();
      current += (target - current) * (1 - Math.exp(-dt / SMOOTH_TAU_MS));
      if (Math.abs(target - current) < DONE_EPS) current = target;
      apply(current);
      raf = current === target ? 0 : requestAnimationFrame(tick);
    };
    const wake = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const onResize = () => {
      lastT = Number.NaN; // geometry changed: re-measure and rewrite
      wake();
    };

    window.addEventListener("scroll", wake, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("scroll", wake);
      window.removeEventListener("resize", onResize);
    };
  }, [sectionRef, lensWidth, lensHeight, pad]);

  return {
    stageRef,
    frameRef,
    contentRef,
    coverRef,
    reticleRef,
    hintRef,
    giantRef,
    headingRef,
    chromeRef,
    floorRef,
  };
}
