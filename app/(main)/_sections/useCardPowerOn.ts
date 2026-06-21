"use client";

import { useEffect } from "react";
import { gsap } from "@/lib/gsap";

// Plays a GSAP "power-on" on whichever card just became centred: the corner
// brackets pop in, and (for cards that have one) a bright scanline sweeps top→
// bottom so the card reads as booting up. Targets the card by data-cf-index
// inside `containerRef`, animating only the HUD chrome (overlay children) — never
// the card's own transform, which the coverflow engine owns — so the two can't
// fight. Skipped under reduced motion; GSAP context reverts on change/unmount.
export function useCardPowerOn(
  containerRef: React.RefObject<HTMLElement | null>,
  activeIndex: number
): void {
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    const card = root.querySelector<HTMLElement>(
      `[data-cf-index="${activeIndex}"]`
    );
    if (!card) return;

    const sweep = card.querySelector<HTMLElement>("[data-hud-sweep]");
    const brackets = card.querySelectorAll<HTMLElement>(".hud-bracket");
    const h = card.clientHeight || 600;

    const ctx = gsap.context(() => {
      if (brackets.length) {
        gsap.fromTo(
          brackets,
          { scale: 0.55 },
          {
            scale: 1,
            duration: 0.45,
            ease: "back.out(2.2)",
            transformOrigin: "center",
          }
        );
      }
      if (sweep) {
        gsap.fromTo(
          sweep,
          { y: -16, opacity: 1 },
          {
            y: h,
            duration: 0.5,
            ease: "power2.in",
            onComplete: () => gsap.to(sweep, { opacity: 0, duration: 0.15 }),
          }
        );
      }
    }, root);

    return () => ctx.revert();
  }, [containerRef, activeIndex]);
}
