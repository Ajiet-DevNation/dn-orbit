"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";

// Shared nav chrome for the Projects / Members cover-flows: chunky pixel side
// arrows, a "03 / 14" position counter, and a soft floor glow under the centre
// card. All purely presentational — the parent wires the handlers from
// useCoverflow (next / prev / activeIndex / count).

const ArrowButton = memo(function ArrowButton({
  dir,
  onClick,
}: {
  dir: "prev" | "next";
  onClick: () => void;
}) {
  const isPrev = dir === "prev";
  return (
    <button
      type="button"
      aria-label={isPrev ? "Previous card" : "Next card"}
      onClick={onClick}
      className={[
        "retro absolute top-1/2 z-[1100] grid size-11 -translate-y-1/2 place-items-center",
        "border-2 border-white/15 bg-[#0a0a0a]/60 text-2xl leading-none text-white/65 backdrop-blur-sm",
        "transition-colors duration-200 hover:border-[#22c55e] hover:text-[#22c55e]",
        "focus-visible:border-[#22c55e] focus-visible:text-[#22c55e] focus-visible:outline-none",
        isPrev ? "left-1 sm:left-3" : "right-1 sm:right-3",
      ].join(" ")}
    >
      <span className="-mt-1">{isPrev ? "‹" : "›"}</span>
    </button>
  );
});

export const CoverflowControls = memo(function CoverflowControls({
  onPrev,
  onNext,
  index,
  count,
  // Vertical placement of the "NN / NN" counter. Defaults snug under the row;
  // sections pass `counterStyle` to anchor it just below the centre card's
  // bottom edge (card-height aware) so it never overlaps the card.
  counterClassName = "bottom-2",
  counterStyle,
}: {
  onPrev: () => void;
  onNext: () => void;
  index: number;
  count: number;
  counterClassName?: string;
  counterStyle?: React.CSSProperties;
}) {
  if (count <= 1) return null;
  return (
    <>
      <ArrowButton dir="prev" onClick={onPrev} />
      <ArrowButton dir="next" onClick={onNext} />
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 z-[1100] flex items-center justify-center",
          counterClassName
        )}
        style={counterStyle}
      >
        <span className="retro text-[10px] tracking-[0.2em] text-muted-foreground">
          <span className="text-[#22c55e]">
            {String(Math.min(index + 1, count)).padStart(2, "0")}
          </span>
          <span className="px-1.5 text-white/30">/</span>
          {String(count).padStart(2, "0")}
        </span>
      </div>
    </>
  );
});

// Soft elliptical glow beneath the centre card, grounding the row so it reads as
// a deliberate composition instead of cards floating in empty space.
export const CoverflowFloor = memo(function CoverflowFloor() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute left-1/2 top-[58%] z-0 h-40 w-[80%] max-w-3xl -translate-x-1/2 -translate-y-1/2"
      style={{
        background:
          "radial-gradient(ellipse at center, rgba(34,197,94,0.16), rgba(34,197,94,0.04) 45%, transparent 72%)",
      }}
    />
  );
});
