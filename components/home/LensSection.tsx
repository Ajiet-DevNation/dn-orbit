"use client";

import { useLensEntrance } from "@/hooks/useLensEntrance";
import { ENTRANCE_PIN_SVH, VIEWFINDER_SHARE } from "@/lib/lens-entrance";
import { cn } from "@/lib/utils";
import { CoverflowFloor } from "./CoverflowControls";
import { SectionHeading } from "./SectionHeading";

// Shared shell for the Projects and Members lens carousels: the pinned section,
// the viewfinder/lens frame, the giant title, the pixel cover and the HUD
// reticle that make up the scroll entrance (hooks/useLensEntrance.ts), plus
// the thumb layer and nav chrome the carousel itself drives (useCoverflow).
// The sections own their data, cards and carousel options; this owns the stage.

/** Frame border + inner gap around the lens, px. */
export const LENS_PAD = 6;
/** Pixel cover columns; rows follow the lens aspect so cells stay square. */
const COVER_COLS = 12;

const GIANT_GLOW =
  "0 0 18px rgba(34,197,94,0.55), 0 0 48px rgba(34,197,94,0.28), 0 0 2px rgba(255,255,255,0.8)";

interface LensSectionProps {
  id: string;
  title: string;
  sectionRef: React.RefObject<HTMLElement | null>;
  /** The lens window; holds the big cards (and is what the power-on scans). */
  lensRef: React.RefObject<HTMLDivElement | null>;
  lensWidth: number;
  lensHeight: number;
  setIntro: (value: number) => void;
  stageHandlers: React.HTMLAttributes<HTMLDivElement>;
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
  sectionRef,
  lensRef,
  lensWidth,
  lensHeight,
  setIntro,
  stageHandlers,
  stageClassName,
  stageStyle,
  cards,
  thumbs,
  controls,
  children,
}: LensSectionProps) {
  const entrance = useLensEntrance({
    sectionRef,
    lensWidth,
    lensHeight,
    pad: LENS_PAD,
    setIntro,
  });

  const side = Math.min(lensWidth, lensHeight) * VIEWFINDER_SHARE;
  const coverRows = Math.max(
    6,
    Math.round((COVER_COLS * lensHeight) / lensWidth),
  );

  return (
    <section
      ref={sectionRef}
      id={id}
      // Pinned for ENTRANCE_PIN_SVH of extra scroll while the entrance plays.
      // The negative scroll margin makes nav/anchor jumps land at the END of
      // the pin, with the lens already formed. Reduced motion: no pin.
      className="relative h-[calc(100svh+var(--pin))] w-full scroll-mt-[calc(var(--pin)*-1)] motion-reduce:h-auto motion-reduce:scroll-mt-24"
      style={{ "--pin": `${ENTRANCE_PIN_SVH}svh` } as React.CSSProperties}
    >
      <div className="sticky top-0 flex h-svh w-full flex-col overflow-hidden pb-6 motion-reduce:static motion-reduce:h-auto motion-reduce:min-h-screen motion-reduce:py-20">
        {/* The giant title flies into this heading, which then takes over. */}
        <div
          ref={entrance.headingRef}
          className="shrink-0 pt-28"
          style={{ opacity: 0 }}
        >
          <SectionHeading text={title} />
        </div>

        {/* Lens stage: thumbs run out to both sides, the lens frame sits on
            top of them in the middle (its solid fill is what hides a thumb
            sliding in). */}
        <div
          ref={entrance.stageRef}
          className={cn(
            "relative min-h-0 w-full flex-1 cursor-grab touch-pan-y select-none active:cursor-grabbing",
            stageClassName,
          )}
          style={stageStyle}
          {...stageHandlers}
        >
          <div ref={entrance.floorRef} style={{ opacity: 0 }}>
            <CoverflowFloor />
          </div>

          <div className="absolute inset-0">{thumbs}</div>

          {/* Viewfinder → lens. Its size is scrubbed by the entrance; the lens
              content stays full size and centred, clipped by the frame. */}
          <div
            ref={entrance.frameRef}
            className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 overflow-hidden border-2 border-dashed border-[#22c55e]/40 bg-[#0a0a0a] shadow-[0_0_40px_rgba(0,0,0,0.6)]"
            style={{ width: side + LENS_PAD * 2, height: side + LENS_PAD * 2 }}
          >
            <div
              ref={entrance.contentRef}
              className="absolute left-1/2 top-1/2"
              style={{
                width: lensWidth,
                height: lensHeight,
                marginLeft: -lensWidth / 2,
                marginTop: -lensHeight / 2,
              }}
            >
              <div
                ref={lensRef}
                className="relative h-full w-full overflow-hidden"
              >
                {cards}
              </div>
              {/* 8-bit focus pull: background-coloured blocks clear in a
                  scattered order as the lens opens (same look as PixelReveal). */}
              <div
                ref={entrance.coverRef}
                aria-hidden
                className="pointer-events-none absolute inset-0 grid"
                style={{
                  gridTemplateColumns: `repeat(${COVER_COLS}, 1fr)`,
                  gridTemplateRows: `repeat(${coverRows}, 1fr)`,
                }}
              >
                {Array.from({ length: COVER_COLS * coverRows }, (_, i) => (
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed, positional grid
                  <span key={i} className="bg-[#0a0a0a]" />
                ))}
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

          <div
            ref={entrance.giantRef}
            aria-hidden
            className="retro pointer-events-none absolute left-1/2 top-1/2 z-20 whitespace-nowrap tracking-wider text-white"
            style={{
              fontSize: "clamp(32px, 9vw, 170px)",
              textShadow: GIANT_GLOW,
              opacity: 0,
              visibility: "hidden",
              transform: "translate(-50%, -50%)",
            }}
          >
            {title}
          </div>

          <div
            ref={entrance.hintRef}
            aria-hidden
            className="retro pointer-events-none absolute inset-x-0 z-10 text-center text-[8px] tracking-[0.3em] text-white/50"
            style={{
              top: `calc(50% + ${Math.round(side / 2) + LENS_PAD + 22}px)`,
            }}
          >
            SCROLL{" "}
            <span className="cursor-blink inline-block text-[#22c55e]">▼</span>
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
