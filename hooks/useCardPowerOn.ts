"use client";

import { useEffect } from "react";

// Pops the corner brackets on whichever card just became centred (a quick
// scale-in "power-on"). Targets the card by data-cf-index inside `containerRef`
// and animates only the bracket chrome — never the card's own transform, which
// the coverflow engine owns — so the two can't fight. Web Animations API, not
// CSS, so the global reduced-motion reset can't flatten it; that path is
// skipped explicitly instead.
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

    const pops = Array.from(
      card.querySelectorAll<HTMLElement>(".hud-bracket"),
      (el) =>
        el.animate([{ transform: "scale(0.55)" }, { transform: "scale(1)" }], {
          duration: 450,
          // overshoot-and-settle, close to GSAP's back.out(2.2)
          easing: "cubic-bezier(0.34, 1.8, 0.64, 1)",
        }),
    );

    return () => {
      for (const a of pops) a.cancel();
    };
  }, [containerRef, activeIndex]);
}
