"use client";

import { useEffect } from "react";
import { gsap } from "@/lib/gsap";

// Pops the corner brackets on whichever card just became centred (a quick
// scale-in "power-on"). Targets the card by data-cf-index inside `containerRef`
// and animates only the bracket chrome — never the card's own transform, which
// the coverflow engine owns — so the two can't fight. Skipped under reduced
// motion; GSAP context reverts on change/unmount.
export function useCardPowerOn(
  containerRef: React.RefObject<HTMLElement | null>,
  activeIndex: number,
): void {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const card = root.querySelector<HTMLElement>(
      `[data-cf-index="${activeIndex}"]`,
    );
    if (!card) return;

    const brackets = card.querySelectorAll<HTMLElement>(".hud-bracket");

    const ctx = gsap.context(() => {
      if (brackets.length) {
        gsap.fromTo(
          brackets,
          // Fires on every card change, arrow keys included, so it stays a
          // short settle (no overshoot) rather than a bounce.
          { scale: 0.9 },
          {
            scale: 1,
            duration: 0.2,
            ease: "power3.out",
            transformOrigin: "center",
          },
        );
      }
    }, root);

    return () => ctx.revert();
  }, [containerRef, activeIndex]);
}
