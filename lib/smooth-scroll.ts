import type Lenis from "lenis";

// The page's single Lenis instance (components/layout/SmoothScroll), shared so
// code that moves the page goes through it. A native smooth scroll started
// while Lenis is gliding would fight it frame by frame.

let instance: Lenis | null = null;

export function setLenis(lenis: Lenis | null): void {
  instance = lenis;
}

export function getLenis(): Lenis | null {
  return instance;
}

/** Long programmatic jumps (nav) take this long, so they read as one motion. */
const JUMP_SECONDS = 1.4;

// glide to an element (honours scroll-margin-top) or a y position
export function smoothScrollTo(target: HTMLElement | number): void {
  if (instance) {
    instance.scrollTo(target, { duration: JUMP_SECONDS });
    return;
  }
  if (typeof target === "number") {
    window.scrollTo({ top: target, behavior: "smooth" });
  } else {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// freeze / release page scroll for modals (no-op without Lenis)
export function setScrollLocked(locked: boolean): void {
  if (locked) instance?.stop();
  else instance?.start();
}
