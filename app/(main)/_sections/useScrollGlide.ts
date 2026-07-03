"use client";

import { useEffect } from "react";
import { glideEndpoints } from "@/lib/glide";
import { gsap } from "@/lib/gsap";

// Scroll-linked horizontal glide for a carousel stage wrapper (GSAP ScrollTrigger).
// As the section travels the viewport the wrapper drifts horizontally: direction
// -1 nets leftward (Projects), +1 rightward (Members). One compositor transform on
// a PARENT of the cards, so it composes with the per-card coverflow transforms
// instead of fighting them. Never created under reduced motion (gsap.matchMedia),
// honoring the global CSS reset. scrub gives a fast-but-buttery lag.
interface GlideOptions {
  direction: -1 | 1;
  distancePx?: number;
  scrub?: number;
}

export function useScrollGlide(
  sectionRef: React.RefObject<HTMLElement | null>,
  stageRef: React.RefObject<HTMLElement | null>,
  { direction, distancePx = 160, scrub = 0.6 }: GlideOptions,
): void {
  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;
    const { fromX, toX } = glideEndpoints(direction, distancePx);

    const mm = gsap.matchMedia();
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      gsap.fromTo(
        stage,
        { x: fromX },
        {
          x: toX,
          ease: "none",
          scrollTrigger: {
            trigger: section,
            start: "top bottom",
            end: "bottom top",
            scrub,
            invalidateOnRefresh: true,
          },
        },
      );
    });

    return () => mm.revert(); // kills tween + ScrollTrigger and clears props
  }, [sectionRef, stageRef, direction, distancePx, scrub]);
}
