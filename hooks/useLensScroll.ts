"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import {
  dwellFocus,
  entranceFrame,
  entranceProgress,
  hintOpacity,
  LENS_FROST,
  progressForCard,
  splitPin,
  viewfinderSize,
} from "@/lib/lens-entrance";
import { getLenis, smoothScrollTo } from "@/lib/smooth-scroll";

// Scroll drives the whole lens section, like oryzo.ai (choreography in
// lib/lens-entrance.ts): first the entrance, then — still pinned — the gallery,
// one card per ITEM_PIN_SVH of scroll. Progress comes straight from the
// section's live rect every frame, so content above changing height (event
// search, leaderboard pages) can never leave it out of step the way cached
// trigger offsets can. An exponential follow smooths wheel steps into a glide.
//
// Everything is written imperatively to refs — no React renders per frame. The
// global CSS reset can't flatten a rAF loop, so reduced motion takes its own
// path: no listeners, the finished entrance written once, and navigation jumps
// cards directly (the section also drops its pin via motion-reduce: classes).

/** Follow time constant for the scrub without Lenis, ms (a Lenis-like glide). */
const SMOOTH_TAU_MS = 140;
const MAX_DT_MS = 50;
const DONE_EPS = 0.0005;
/** Giant title starts this share of the viewport width to the right — a full
 *  width, so it enters from entirely off-screen like oryzo's. */
const GIANT_SLIDE_SHARE = 1;

interface LensScrollOptions {
  sectionRef: React.RefObject<HTMLElement | null>;
  count: number;
  lensWidth: number;
  lensHeight: number;
  /** Frame border + inner gap around the lens, px. */
  pad: number;
  /** Drives the thumb strips (useCoverflow's setIntro). */
  setIntro: (value: number) => void;
  /** Drives the row position (useCoverflow's setFocus). */
  setFocus: (value: number) => void;
  /** useCoverflow's navigation hook; pointed at "scroll to that card". */
  navigateRef: React.RefObject<(index: number) => void>;
}

export function useLensScroll({
  sectionRef,
  count,
  lensWidth,
  lensHeight,
  pad,
  setIntro,
  setFocus,
  navigateRef,
}: LensScrollOptions) {
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const giantRef = useRef<HTMLDivElement>(null);
  const giantLineRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLSpanElement>(null);
  const headingRef = useRef<HTMLDivElement>(null);
  const chromeRef = useRef<HTMLDivElement>(null);
  const floorRef = useRef<HTMLDivElement>(null);

  // Read through refs so a new callback identity can't restart the loop.
  const setIntroRef = useRef(setIntro);
  const setFocusRef = useRef(setFocus);
  useEffect(() => {
    setIntroRef.current = setIntro;
    setFocusRef.current = setFocus;
  }, [setIntro, setFocus]);

  // Layout effect: the first frame is written before paint, so a resize never
  // flashes the JSX defaults.
  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const frame = frameRef.current;
    const content = contentRef.current;
    const giant = giantRef.current;
    const giantLine = giantLineRef.current;
    const heading = headingRef.current;
    if (
      !section ||
      !stage ||
      !frame ||
      !content ||
      !giant ||
      !giantLine ||
      !heading
    )
      return;

    let lastT = Number.NaN;
    let lastBlur = -1;
    let lastGiantOn = false;
    let lastVeil = -1;
    let lastSolid = -1;

    // One scalar timeline over the whole pin (entrance, then gallery), so
    // every phase stays continuous. `still` = reduced motion: no pin, no hint,
    // and the row is left where navigation puts it.
    const apply = (pin: number, still = false) => {
      if (pin === lastT) return;
      lastT = pin;
      const { entrance, gallery } = splitPin(pin, count);
      const f = entranceFrame(entrance);

      // Reads first (layout), then writes, so each frame forces at most one
      // layout. The flight target is measured live while it is in use.
      let dx = 0;
      let dy = 0;
      let flyScale = 1;
      if (f.fly > 0) {
        // The title scales from its left-centre (transform-origin), so the
        // flight is: move its left edge onto the label's, its centre line onto
        // the label's, and scale to the label's width. Rest box = the line
        // wrapper (stage centre) plus the title's untransformed offset.
        const title = heading.querySelector("h2") ?? heading;
        const target = title.getBoundingClientRect();
        const line = giantLine.getBoundingClientRect();
        dx = target.left - (line.left + giant.offsetLeft);
        dy = target.top + target.height / 2 - line.top;
        flyScale = target.width / Math.max(1, giant.offsetWidth);
      }

      const box = viewfinderSize(f.open, lensWidth, lensHeight);
      frame.style.width = `${box.width + pad * 2}px`;
      frame.style.height = `${box.height + pad * 2}px`;

      // Blur-in: the card appears soft and sharpens. A filter holds its own
      // compositing layer, so it is dropped entirely once sharp.
      const blur = Math.round(f.blur * 10) / 10;
      if (blur !== lastBlur) {
        content.style.filter = blur > 0 ? `blur(${blur}px)` : "";
        lastBlur = blur;
      }

      const slide = (1 - f.giantIn) * window.innerWidth * GIANT_SLIDE_SHARE;
      const scale = 1 + (flyScale - 1) * f.fly;
      giant.style.transform =
        `translate3d(${slide + dx * f.fly}px, ${dy * f.fly}px, 0) ` +
        `scale(${scale})`;
      if (glowRef.current) glowRef.current.style.opacity = String(f.glow);

      // Frosted lens: see-through + blurring while the title sits behind it,
      // solid once the gallery needs it to hide the thumbs sliding under. The
      // backdrop blur is dropped entirely once solid — it would otherwise be
      // re-computed every frame the thumbs move.
      const veil = Math.round(f.veil * 100) / 100;
      if (veil !== lastVeil) {
        content.style.opacity = String(veil);
        lastVeil = veil;
      }
      const solid = Math.round(f.solid * 100) / 100;
      if (solid !== lastSolid) {
        frame.style.backgroundColor = `rgba(10, 10, 10, ${0.3 + 0.7 * solid})`;
        const frost = solid < 1 ? LENS_FROST : "none";
        frame.style.backdropFilter = frost;
        frame.style.setProperty("-webkit-backdrop-filter", frost);
        lastSolid = solid;
      }
      giant.style.opacity = String(f.giantOpacity);
      const giantOn = f.giantOpacity > 0;
      if (giantOn !== lastGiantOn) {
        giant.style.visibility = giantOn ? "" : "hidden";
        // Its own layer while it moves: the glowing glyphs and the frosted
        // backdrop are then composited, not re-painted, every frame.
        giant.style.willChange = giantOn ? "transform, opacity" : "";
        lastGiantOn = giantOn;
      }
      heading.style.opacity = String(f.heading);

      if (reticleRef.current)
        reticleRef.current.style.opacity = String(f.reticle);
      if (hintRef.current)
        hintRef.current.style.opacity = String(
          still ? 0 : hintOpacity(pin) * (1 - f.chrome),
        );
      if (floorRef.current) floorRef.current.style.opacity = String(f.chrome);
      if (chromeRef.current) {
        chromeRef.current.style.opacity = String(f.chrome);
        chromeRef.current.style.visibility = f.chrome > 0 ? "" : "hidden";
      }

      setIntroRef.current(f.thumbs);
      if (!still) setFocusRef.current(dwellFocus(gallery, count));
    };

    const read = () => {
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      return entranceProgress(r.top, r.height, vh);
    };

    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      // No pin: show the finished entrance; arrows/keys jump cards directly
      // (useCoverflow's default navigation).
      apply(progressForCard(0, count), true);
      return;
    }

    // Arrows, keys and thumb clicks scroll the page to that card, so the
    // scroll position stays the single source of truth for the row.
    navigateRef.current = (index: number) => {
      const r = section.getBoundingClientRect();
      const travel = r.height - window.innerHeight;
      smoothScrollTo(
        r.top + window.scrollY + progressForCard(index, count) * travel,
      );
    };

    let current = read();
    let raf = 0;
    let last = 0;
    apply(current);

    const tick = (now: number) => {
      const dt = Math.min(now - last, MAX_DT_MS);
      last = now;
      const target = read();
      // Under Lenis the scroll position is already eased; following it
      // directly keeps the lens locked to it instead of trailing a second ease.
      current = getLenis()
        ? target
        : current + (target - current) * (1 - Math.exp(-dt / SMOOTH_TAU_MS));
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

    // Only track scroll while the section is near the viewport; crossing the
    // margin either way wakes one last settle, so it always rests clamped.
    let near = false;
    const onScroll = () => {
      if (near) wake();
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        near = entry.isIntersecting;
        wake();
      },
      { rootMargin: "50% 0px" },
    );
    io.observe(section);

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [sectionRef, count, lensWidth, lensHeight, pad, navigateRef]);

  return {
    stageRef,
    frameRef,
    contentRef,
    reticleRef,
    hintRef,
    giantRef,
    giantLineRef,
    glowRef,
    headingRef,
    chromeRef,
    floorRef,
  };
}
