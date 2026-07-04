"use client";

import { useEffect, useState } from "react";

// SSR-safe viewport width. Returns `defaultWidth` on the server and the first
// client render (so hydration matches), then the real width after mount and on
// resize. Used to size the coverflow carousels responsively.
export function useViewportWidth(defaultWidth = 1280): number {
  const [width, setWidth] = useState(defaultWidth);
  useEffect(() => {
    const update = () => setWidth(window.innerWidth);
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update);
  }, []);
  return width;
}
