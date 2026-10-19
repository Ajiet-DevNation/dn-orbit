"use client";

import Lenis from "lenis";
import "lenis/dist/lenis.css";
import { useEffect } from "react";
import { setLenis } from "@/lib/smooth-scroll";

// oryzo-style smooth scrolling for the public site: wheel steps glide instead
// of jumping. Lenis keeps the browser's real scroll underneath, so the sticky
// lens pins, anchors, keyboard and touch all behave natively; touch is left
// fully native (no syncTouch) so phones keep their own momentum.
export function SmoothScroll() {
  useEffect(() => {
    // Reduced motion: plain native scrolling.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const lenis = new Lenis({
      autoRaf: true,
      lerp: 0.1,
      // In-page #links glide too, and land on scroll-margin-top.
      anchors: true,
      // Scrollable modals and lists keep their own wheel scrolling.
      allowNestedScroll: true,
      stopInertiaOnNavigate: true,
    });
    setLenis(lenis);
    return () => {
      setLenis(null);
      lenis.destroy();
    };
  }, []);
  return null;
}
