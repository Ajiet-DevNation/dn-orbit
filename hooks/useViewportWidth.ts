"use client";

import { useEffect, useState } from "react";

// SSR-safe viewport width. Returns `defaultWidth` on the server and the first
// client render (so hydration matches), then the real width after mount and on
// resize. Used to size the coverflow carousels responsively.
//
// Two deliberate details, both there to protect the carousels:
//
// - The resize handler is rAF-coalesced. A drag of the window edge fires
//   `resize` dozens of times a second, and every one of those used to be a
//   setState — i.e. a full re-render of a fifteen-card section.
// - Only WIDTH changes are published. On mobile, showing/hiding the URL bar
//   fires `resize` with an unchanged width, and that re-render would restart
//   the carousel's animation loop mid-scroll. Returning the previous value
//   makes React bail out of the render entirely.
export function useViewportWidth(defaultWidth = 1280): number {
  const [width, setWidth] = useState(defaultWidth);

  useEffect(() => {
    let frame = 0;

    const publish = () => {
      frame = 0;
      setWidth((previous) =>
        previous === window.innerWidth ? previous : window.innerWidth,
      );
    };

    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(publish);
    };

    publish();
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return width;
}
