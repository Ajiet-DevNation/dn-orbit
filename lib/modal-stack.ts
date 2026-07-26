// Tracks which modals are open, in the order they opened.
//
// Two bugs this exists to prevent, both of which the previous per-modal
// `useModalBehavior` had:
//
//  1. Scroll-lock stomping. Each modal saved and restored
//     `document.body.style.overflow` independently. Open the profile modal
//     (locks), open its confirm sheet on top (locks again, saving the ALREADY
//     locked "hidden" as the value to restore), close the sheet → body is
//     restored to "hidden" and the page can never scroll again, or in the
//     reverse ordering the page starts scrolling behind a still-open modal.
//     Depth-counting fixes both: the body unlocks exactly once, when the last
//     modal closes.
//
//  2. Escape closing everything at once. Every open modal had its own window
//     keydown listener, so one Escape press closed the confirm sheet AND the
//     modal underneath it. Only the top-most modal should react.
//
// Deliberately module-level rather than React context: modals here are rendered
// from unrelated trees (headers, sections, portaled drawers) and threading a
// provider through all of them would be a much larger change for no benefit.

let stack: string[] = [];

/** Register a modal as open. Ignores duplicates so a re-render can't double-count. */
export function pushModal(id: string): void {
  if (stack.includes(id)) return;
  stack.push(id);
}

/** Deregister a modal. Safe to call for an id that isn't open. */
export function popModal(id: string): void {
  stack = stack.filter((entry) => entry !== id);
}

/**
 * True when `id` is the top-most open modal — i.e. the one that should react to
 * Escape and hold the focus trap.
 */
export function isTopModal(id: string): boolean {
  return stack.length > 0 && stack[stack.length - 1] === id;
}

/** How many modals are currently open. Zero means the body should scroll. */
export function modalDepth(): number {
  return stack.length;
}

/** Test-only: clear state so cases don't leak into each other. */
export function __resetModalStack(): void {
  stack = [];
}
