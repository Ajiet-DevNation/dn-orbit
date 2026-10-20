import Link from "next/link";
import { ViewTransition } from "react";
import { PixelArrow } from "@/components/ui/PixelIcons";

// Thin "we're hiring" tab floated over the top of the hero. Rendered by the
// landing page only while an admin has recruitment switched on. Absolute so it
// doesn't push the full-height orbit down. It shares the top row with the
// sticky header (z-50), so it sits above it (z-60), centred on the logo row;
// the wrapper is click-through so the gaps beside it don't block the logo or
// avatar. On phones it drops below the header row.
//
// Its frame is the nav tabs' frame (8bit-tabs TabsList): card fill with 6px
// ring-coloured bars pushed outside each edge, which leaves the corners
// notched. That is what makes it read as part of the header.
//
// Clicking it morphs the strip into the JOIN DEVNATION card on /recruitments
// (a shared <ViewTransition> name, see RecruitHeaderCard and the route
// transition rules in globals.css). The morph only runs for this hand-off.
export const RECRUIT_CARD_TRANSITION = "recruit-card";
export const RECRUIT_MORPH = {
  "recruit-in": "recruit-morph",
  "recruit-out": "recruit-morph",
  default: "none",
};

export function RecruitmentBanner() {
  // Landscape phones (short + wide enough) also get the header-row slot:
  // below the header it sat on top of the hero logo.
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-[60] flex justify-center px-4 md:top-[36px] [@media(max-height:500px)_and_(min-width:640px)]:top-[36px]">
      <ViewTransition
        name={RECRUIT_CARD_TRANSITION}
        share={RECRUIT_MORPH}
        default="none"
      >
        <Link
          href="/recruitments"
          transitionTypes={["recruit-in"]}
          className="group retro pointer-events-auto relative inline-flex h-10 items-center gap-3.5 bg-card pr-4 pl-3.5 text-white outline-none focus-visible:outline-2 focus-visible:outline-offset-8 focus-visible:outline-brand-light"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -my-1.5 border-y-[6px] border-ring transition-colors duration-200 group-hover:border-brand"
          />
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 -mx-1.5 border-x-[6px] border-ring transition-colors duration-200 group-hover:border-brand"
          />

          {/* Live dot: a pixel that blinks in two hard steps. */}
          <span
            aria-hidden
            className="size-2 shrink-0 animate-[recruit-blink_1.2s_steps(1,end)_infinite] bg-brand shadow-[0_0_8px_rgba(139,92,246,0.8)]"
          />
          <span className="text-[8px] tracking-[0.28em] text-brand-light">
            RECRUITING
          </span>
          <span
            aria-hidden
            className="hidden h-3.5 w-0.5 bg-white/15 xl:block"
          />
          <span className="hidden whitespace-nowrap font-mono text-xs tracking-normal text-white/65 xl:inline">
            Think you could be part of DevNation? We&apos;d love to have you.
          </span>
          <span aria-hidden className="h-3.5 w-0.5 bg-white/15" />
          <span className="inline-flex items-center gap-2 whitespace-nowrap text-[8px] transition-colors duration-200 group-hover:text-brand-light">
            APPLY NOW
            <PixelArrow className="transition-transform duration-200 ease-out group-hover:translate-x-[3px]" />
          </span>
        </Link>
      </ViewTransition>
    </div>
  );
}
