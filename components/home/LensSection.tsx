"use client";

import { useLensScroll } from "@/hooks/useLensScroll";
import {
  ENTRANCE_PIN_SVH,
  LENS_FROST,
  pinLengthSvh,
  viewfinderSide,
} from "@/lib/lens-entrance";
import { cn } from "@/lib/utils";
import { CoverflowFloor } from "./CoverflowControls";

// Shared shell for the Projects and Members lens carousels: the pinned section,
// the viewfinder/lens frame, the giant title and the HUD reticle that make up
// the scroll entrance (hooks/useLensScroll.ts), plus
// the thumb layer and nav chrome the carousel itself drives (useCoverflow).
// The sections own their data, cards and carousel options; this owns the stage.

/** The "01 / 08" counter takes the scroll hint's spot in the bottom row once
 *  the gallery starts (the hint fades out as the controls fade in), so the two
 *  never stack or overlap. A constant, so CoverflowControls' memo holds. */
export const LENS_COUNTER_STYLE = { bottom: 36, top: "auto" } as const;

/** Frame border + inner gap around the lens, px. */
export const LENS_PAD = 6;

const GIANT_BLOOM =
  "0 0 24px rgba(255,255,255,0.55), 0 0 60px rgba(34,197,94,0.5), 0 0 120px rgba(34,197,94,0.3)";

const GIANT_GLOW =
  "0 0 18px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.28), 0 0 2px rgba(255,255,255,0.8)";

interface LensSectionProps {
  id: string;
  title: string;
  /** Small line above the title, e.g. "WHAT WE BUILD". */
  kicker: string;
  sectionRef: React.RefObject<HTMLElement | null>;
  /** The lens window; holds the big cards (and is what the power-on scans). */
  lensRef: React.RefObject<HTMLDivElement | null>;
  lensWidth: number;
  lensHeight: number;
  count: number;
  setIntro: (value: number) => void;
  setFocus: (value: number) => void;
  navigateRef: React.RefObject<(index: number) => void>;
  stageClassName?: string;
  stageStyle?: React.CSSProperties;
  /** Big cards, rendered inside the lens. */
  cards: React.ReactNode;
  /** Thumbs, rendered either side of the lens. */
  thumbs: React.ReactNode;
  /** Arrows + counter, revealed once the entrance completes. */
  controls: React.ReactNode;
  /** Outside the pinned stage (e.g. a fixed detail overlay). */
  children?: React.ReactNode;
}

export function LensSection({
  id,
  title,
  kicker,
  sectionRef,
  lensRef,
  lensWidth,
  lensHeight,
  count,
  setIntro,
  setFocus,
  navigateRef,
  stageClassName,
  stageStyle,
  cards,
  thumbs,
  controls,
  children,
}: LensSectionProps) {
  const entrance = useLensScroll({
    sectionRef,
    count,
    lensWidth,
    lensHeight,
    pad: LENS_PAD,
    setIntro,
    setFocus,
    navigateRef,
  });

  const side = viewfinderSide(lensWidth, lensHeight);

  return (
    <section
      ref={sectionRef}
      id={id}
      // Pinned while scroll drives it: the entrance, then one step per card.
      // The negative scroll margin makes nav/anchor jumps land where the
      // entrance ends (lens formed, first card). Reduced motion: no pin.
      className="relative h-[calc(100svh+var(--pin))] w-full scroll-mt-[calc(var(--entrance)*-1)] motion-reduce:h-auto motion-reduce:scroll-mt-24"
      style={
        {
          "--pin": `${pinLengthSvh(count)}svh`,
          "--entrance": `${ENTRANCE_PIN_SVH}svh`,
        } as React.CSSProperties
      }
    >
      {/* Oryzo proportions: the lens fills ~80% of the screen height, centred;
          the title sits to its left (above it on phones). */}
      <div className="sticky top-0 h-svh w-full overflow-hidden motion-reduce:relative">
        {/* The giant title flies into this label, which then takes over. The
            kicker is there from the start, like oryzo's "SO PORTABLE,". */}
        <div className="pointer-events-none absolute inset-x-0 top-[92px] z-30 flex flex-col items-center gap-3 md:inset-x-auto md:left-[max(24px,3.5vw)] md:top-[24%] md:items-start">
          <p className="retro text-[9px] tracking-[0.3em] text-[#22c55e] md:text-[clamp(10px,0.8vw,14px)]">
            {kicker}
          </p>
          <div
            ref={entrance.headingRef}
            className="flex flex-col items-center gap-4 md:items-start"
            style={{ opacity: 0 }}
          >
            <h2 className="retro text-xl tracking-wider text-white md:text-[clamp(20px,1.8vw,32px)]">
              {title}
            </h2>
            <span aria-hidden className="block h-[3px] w-16 bg-[#22c55e]" />
          </div>
        </div>

        {/* Lens stage: thumbs run out to both sides, the lens frame sits on
            top of them in the middle (its solid fill is what hides a thumb
            sliding in). */}
        <div
          ref={entrance.stageRef}
          className={cn(
            "absolute inset-x-0 bottom-0 top-[150px] select-none md:top-0",
            stageClassName,
          )}
          style={stageStyle}
        >
          <div ref={entrance.floorRef} style={{ opacity: 0 }}>
            <CoverflowFloor />
          </div>

          <div className="absolute inset-0">{thumbs}</div>

          {/* Viewfinder → lens. Its size is scrubbed by the entrance; the lens
              content stays full size and centred, clipped by the frame. */}
          <div
            ref={entrance.frameRef}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden border-2 border-dashed border-[#22c55e]/40 shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            // Frosted glass until the entrance ends (the hook turns it solid).
            style={{
              width: side + LENS_PAD * 2,
              height: side + LENS_PAD * 2,
              backgroundColor: "rgba(10, 10, 10, 0.3)",
              backdropFilter: LENS_FROST,
              WebkitBackdropFilter: LENS_FROST,
            }}
          >
            <div
              ref={entrance.contentRef}
              className="absolute left-1/2 top-1/2"
              style={{
                width: lensWidth,
                height: lensHeight,
                marginLeft: -lensWidth / 2,
                marginTop: -lensHeight / 2,
                // Starts hidden: the viewfinder opens as an empty box.
                opacity: 0,
              }}
            >
              <div
                ref={lensRef}
                className="relative h-full w-full overflow-hidden"
              >
                {cards}
              </div>
            </div>

            {/* HUD reticle while the viewfinder is still "scanning". */}
            <div
              ref={entrance.reticleRef}
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10"
            >
              <span className="absolute left-1/2 top-1/2 h-[2px] w-5 -translate-x-1/2 -translate-y-1/2 bg-[#22c55e]/70" />
              <span className="absolute left-1/2 top-1/2 h-5 w-[2px] -translate-x-1/2 -translate-y-1/2 bg-[#22c55e]/70" />
              <span className="absolute left-1/2 top-0 h-2.5 w-[2px] -translate-x-1/2 bg-[#22c55e]/60" />
              <span className="absolute bottom-0 left-1/2 h-2.5 w-[2px] -translate-x-1/2 bg-[#22c55e]/60" />
              <span className="absolute left-0 top-1/2 h-[2px] w-2.5 -translate-y-1/2 bg-[#22c55e]/60" />
              <span className="absolute right-0 top-1/2 h-[2px] w-2.5 -translate-y-1/2 bg-[#22c55e]/60" />
              <span className="retro absolute left-2 top-2 text-[6px] tracking-widest text-[#22c55e]/80">
                SCAN
              </span>
              <span className="cursor-blink absolute right-2 top-2 size-1.5 bg-[#22c55e]" />
            </div>
          </div>

          {/* Giant title, BEHIND the lens like oryzo's: the frosted lens blurs
              whatever part of it passes underneath. Parked with its left edge
              on the label's left edge, it later shrinks from that edge into
              the label. The line wrapper is a zero-height row on the stage's
              vertical centre, so the title's rest box is easy to measure. */}
          <div
            ref={entrance.giantLineRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-1/2 z-[5] flex h-0 items-center justify-center md:justify-start md:pl-[max(24px,3.5vw)]"
          >
            <div
              ref={entrance.giantRef}
              className="retro relative whitespace-nowrap tracking-wider text-white"
              style={{
                fontSize: "clamp(32px, 9vw, 170px)",
                textShadow: GIANT_GLOW,
                transformOrigin: "left center",
                opacity: 0,
                visibility: "hidden",
              }}
            >
              {title}
              {/* Bloom that swells while the lens opens (opacity only). */}
              <span
                ref={entrance.glowRef}
                className="absolute inset-0"
                style={{ textShadow: GIANT_BLOOM, opacity: 0 }}
              >
                {title}
              </span>
            </div>
          </div>

          <div
            ref={entrance.hintRef}
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-7 z-10 flex items-center justify-center gap-3"
          >
            <span className="grid size-6 place-items-center border-2 border-[#22c55e]/60 text-[9px] text-[#22c55e]">
              <span className="hint-bob">▼</span>
            </span>
            <span className="retro text-[8px] tracking-[0.3em] text-white/70">
              SCROLL TO CONTINUE
            </span>
          </div>

          <div
            ref={entrance.chromeRef}
            className="pointer-events-none absolute inset-0 z-[1100] [&_button]:pointer-events-auto"
            style={{ opacity: 0, visibility: "hidden" }}
          >
            {controls}
          </div>
        </div>
      </div>
      {children}
    </section>
  );
}
