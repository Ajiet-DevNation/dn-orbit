"use client";

import { useEffect, useState } from "react";

// SSR-safe viewport size. Returns the defaults on the server and the first
// client render (so hydration matches), then the real size after mount and on
// resize. Used to size the lens carousels, which must fit one pinned screen.
//
// Two deliberate details, both there to protect the carousels:
//
// - The resize handler is rAF-coalesced. A drag of the window edge fires
//   `resize` dozens of times a second, and every one of those used to be a
//   setState — i.e. a full re-render of a fifteen-card section.
// - Small HEIGHT changes are ignored on touch screens. There, showing/hiding
//   the URL bar fires `resize` with a slightly different height, and that
//   re-render would resize the lens mid-scroll. A desktop window has no URL
//   bar to hide, so every height change there is real and gets through.
const HEIGHT_JITTER_PX = 140;

interface ViewportSize {
  width: number;
  height: number;
}

export function useViewportSize(
  defaultSize: ViewportSize = { width: 1280, height: 900 },
): ViewportSize {
  const [size, setSize] = useState(defaultSize);

  useEffect(() => {
    let frame = 0;
    const jitter = window.matchMedia?.("(pointer: coarse)").matches
      ? HEIGHT_JITTER_PX
      : 1;

    const publish = () => {
      frame = 0;
      const width = window.innerWidth;
      const height = window.innerHeight;
      setSize((previous) =>
        previous.width === width && Math.abs(previous.height - height) < jitter
          ? previous
          : { width, height },
      );
    };

    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(publish);
    };

    // First publish always lands: the server default is a guess.
    setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return size;
}
