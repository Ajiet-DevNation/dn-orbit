"use client";

import { useRef, useEffect } from "react";
import { motion, useScroll, useTransform, useMotionValue } from "framer-motion";
import { Users, FileText, BarChart3 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MotionValue } from "framer-motion";

/* ══════════════════════════════════════════════════════════════
   ABOUT SECTION — Scroll-Driven Satellite Deployment (Ratcheted)

   Every animation phase is tied directly to scroll position via
   useScroll + useTransform. The user "manually deploys" the
   satellite by scrolling.

   Ratchet mechanism: A custom MotionValue tracks the MAXIMUM
   scroll progress reached. Values only go forward, never back.
   Once the satellite is deployed (~70%), it stays deployed even
   if the user scrolls back up.

   Scroll timeline (mapped to ratcheted progress 0→1):
     0.00–0.10  Hub emerges (opacity + scale)
     0.08–0.22  Side arms extend outward
     0.10–0.24  Bottom arm extends downward
     0.22–0.45  Left panel hinges open (rotateY -90→0)
     0.25–0.48  Right panel hinges open (rotateY 90→0)
     0.45–0.70  Bottom panel hinges open (rotateX -90→0)
     0.70+       Fully deployed — locked permanently

   Layout: 98vw / 1600px max, 40–60% scale-up.
   Style:  Pure black bg, thin white outlines, no decorative fx.
   ══════════════════════════════════════════════════════════════ */

/* ── Panel Data ── */

interface PanelData {
  title: string;
  description: string;
  Icon: LucideIcon;
}

const PANEL_LEFT: PanelData = {
  title: "CONTENT MANAGEMENT",
  description:
    "Create, organize, and manage all your project content in one place. Keep everything structured and easy to access.",
  Icon: Users,
};

const PANEL_RIGHT: PanelData = {
  title: "PUBLISH & SHARE",
  description:
    "Publish your projects and ideas to the community. Share updates, get feedback, and grow your impact together.",
  Icon: FileText,
};

const PANEL_BOTTOM: PanelData = {
  title: "ANALYTICS & INSIGHTS",
  description:
    "Track engagement, understand your audience, and make data-driven decisions to improve your projects. Real insights, real growth.",
  Icon: BarChart3,
};

/* ══════════════════════════════════════════════════════════════
   SUB-COMPONENTS
   ══════════════════════════════════════════════════════════════ */

/** Central octagonal hub */
function OctagonHub() {
  return (
    <div className="relative flex h-40 w-40 shrink-0 items-center justify-center md:h-48 md:w-48 lg:h-56 lg:w-56">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" fill="none">
        <polygon
          points="30,2 70,2 98,30 98,70 70,98 30,98 2,70 2,30"
          stroke="rgba(255,255,255,0.4)"
          strokeWidth="1"
        />
        <polygon
          points="35,8 65,8 92,35 92,65 65,92 35,92 8,65 8,35"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth="0.7"
        />
        <line x1="50" y1="0" x2="50" y2="5" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <line x1="100" y1="50" x2="95" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <line x1="50" y1="100" x2="50" y2="95" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="5" y2="50" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
      </svg>
      <span
        className="relative z-10 font-mono text-sm font-bold uppercase tracking-[0.3em] text-white md:text-base lg:text-lg"
        style={{ fontFamily: "var(--font-inter-tight), sans-serif" }}
      >
        ABOUT
      </span>
    </div>
  );
}

/** Junction dot */
function JunctionDot() {
  return <span className="h-2 w-2 shrink-0 rounded-full border border-white/25 bg-white/5" />;
}

/** Info panel card */
function InfoPanel({ data }: { data: PanelData }) {
  const { title, description, Icon } = data;
  return (
    <div className="about-card relative h-full border border-white/12 bg-black">
      <div className="absolute left-0 top-0 h-5 w-5 border-l border-t border-white/25" />
      <div className="absolute right-0 top-0 h-5 w-5 border-r border-t border-white/25" />
      <div className="absolute bottom-0 left-0 h-5 w-5 border-b border-l border-white/25" />
      <div className="absolute bottom-0 right-0 h-5 w-5 border-b border-r border-white/25" />

      <div className="p-6 md:p-8 lg:p-10">
        <div className="mb-5 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
          <span className="h-2 w-2 rounded-full bg-white/20" />
        </div>

        <div className="flex items-start gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-white/15 md:h-14 md:w-14">
            <Icon className="h-6 w-6 text-white/40 md:h-7 md:w-7" />
          </div>
          <div className="min-w-0">
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white md:text-base">
              {title}
            </h3>
            <p className="mt-2 font-mono text-xs leading-relaxed text-white/30 md:text-sm md:leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   RATCHET HOOK — MotionValue that only ever increases

   Tracks the maximum value of an input MotionValue. Once the
   satellite deploys to 70%, scrolling back up doesn't undo it.
   ══════════════════════════════════════════════════════════════ */

function useRatchet(source: MotionValue<number>): MotionValue<number> {
  const ratcheted = useMotionValue(0);
  const maxRef = useRef(0);

  useEffect(() => {
    // Set initial value
    const initial = source.get();
    if (initial > maxRef.current) {
      maxRef.current = initial;
      ratcheted.set(initial);
    }

    const unsubscribe = source.on("change", (v) => {
      if (v > maxRef.current) {
        maxRef.current = v;
        ratcheted.set(v);
      }
    });

    return unsubscribe;
  }, [source, ratcheted]);

  return ratcheted;
}

/* ══════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════════════════════════ */

export function AboutSection() {
  const containerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  // Ratcheted progress — only increases, never decreases
  const p = useRatchet(scrollYProgress);

  /* ── Phase 1: Hub (0.00 → 0.10) ── */
  const hubOpacity = useTransform(p, [0, 0.10], [0, 1]);
  const hubScale = useTransform(p, [0, 0.10], [0.3, 1]);

  /* ── Phase 2: Side arms (0.08 → 0.22) ── */
  const armSideScale = useTransform(p, [0.08, 0.22], [0, 1]);

  /* ── Phase 3: Bottom arm (0.10 → 0.24) ── */
  const armBottomScale = useTransform(p, [0.10, 0.24], [0, 1]);

  /* ── Phase 4: Left panel (0.22 → 0.45) ── */
  const leftRotateY = useTransform(p, [0.22, 0.45], [-90, 0]);
  const leftOpacity = useTransform(p, [0.22, 0.32], [0, 1]);

  /* ── Phase 5: Right panel (0.25 → 0.48) ── */
  const rightRotateY = useTransform(p, [0.25, 0.48], [90, 0]);
  const rightOpacity = useTransform(p, [0.25, 0.35], [0, 1]);

  /* ── Phase 6: Bottom panel (0.45 → 0.70) ── */
  const bottomRotateX = useTransform(p, [0.45, 0.70], [-90, 0]);
  const bottomOpacity = useTransform(p, [0.45, 0.55], [0, 1]);

  return (
    <section
      ref={containerRef}
      className="relative"
      style={{ height: "250vh", background: "#000000" }}
    >
      {/* Sticky viewport — stays centered while user scrolls through 250vh */}
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">

        {/* ══════ DESKTOP LAYOUT (md+) ══════ */}
        <div
          className="hidden w-[98vw] max-w-[1600px] flex-col items-center md:flex"
          style={{ perspective: 1400 }}
        >
          {/* ── Top row: Left Card + Arm + Hub + Arm + Right Card ── */}
          <div className="flex w-full items-stretch">
            {/* Left card — hinges from right edge */}
            <motion.div
              className="flex-1"
              style={{
                rotateY: leftRotateY,
                opacity: leftOpacity,
                transformOrigin: "right center",
              }}
            >
              <InfoPanel data={PANEL_LEFT} />
            </motion.div>

            {/* Left arm */}
            <div className="flex shrink-0 items-center gap-1.5">
              <JunctionDot />
              <motion.div
                className="h-px w-16 bg-white/20 md:w-24 lg:w-32"
                style={{ scaleX: armSideScale, transformOrigin: "right center" }}
              />
              <JunctionDot />
            </div>

            {/* Hub */}
            <motion.div
              className="shrink-0"
              style={{ opacity: hubOpacity, scale: hubScale }}
            >
              <OctagonHub />
            </motion.div>

            {/* Right arm */}
            <div className="flex shrink-0 items-center gap-1.5">
              <JunctionDot />
              <motion.div
                className="h-px w-16 bg-white/20 md:w-24 lg:w-32"
                style={{ scaleX: armSideScale, transformOrigin: "left center" }}
              />
              <JunctionDot />
            </div>

            {/* Right card — hinges from left edge */}
            <motion.div
              className="flex-1"
              style={{
                rotateY: rightRotateY,
                opacity: rightOpacity,
                transformOrigin: "left center",
              }}
            >
              <InfoPanel data={PANEL_RIGHT} />
            </motion.div>
          </div>

          {/* ── Bottom arm ── */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <JunctionDot />
            <motion.div
              className="w-px bg-white/20"
              style={{ height: 64, scaleY: armBottomScale, transformOrigin: "top center" }}
            />
            <JunctionDot />
          </div>

          {/* ── Bottom card — hinges from top edge ── */}
          <motion.div
            className="w-full max-w-[640px] lg:max-w-[720px]"
            style={{
              rotateX: bottomRotateX,
              opacity: bottomOpacity,
              transformOrigin: "top center",
            }}
          >
            <InfoPanel data={PANEL_BOTTOM} />
          </motion.div>
        </div>

        {/* ══════ MOBILE LAYOUT (< md) ══════ */}
        <div
          className="flex w-[94vw] max-w-md flex-col items-center gap-5 md:hidden"
          style={{ perspective: 900 }}
        >
          {/* Hub */}
          <motion.div style={{ opacity: hubOpacity, scale: hubScale }}>
            <OctagonHub />
          </motion.div>

          {/* Bottom arm */}
          <div className="flex shrink-0 flex-col items-center gap-1">
            <JunctionDot />
            <motion.div
              className="w-px bg-white/20"
              style={{ height: 28, scaleY: armBottomScale, transformOrigin: "top center" }}
            />
            <JunctionDot />
          </div>

          {/* Bottom card */}
          <motion.div
            className="w-full"
            style={{ rotateX: bottomRotateX, opacity: bottomOpacity, transformOrigin: "top center" }}
          >
            <InfoPanel data={PANEL_BOTTOM} />
          </motion.div>

          {/* Left card */}
          <motion.div
            className="w-full"
            style={{ rotateY: leftRotateY, opacity: leftOpacity, transformOrigin: "right center" }}
          >
            <InfoPanel data={PANEL_LEFT} />
          </motion.div>

          {/* Right card */}
          <motion.div
            className="w-full"
            style={{ rotateY: rightRotateY, opacity: rightOpacity, transformOrigin: "left center" }}
          >
            <InfoPanel data={PANEL_RIGHT} />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
