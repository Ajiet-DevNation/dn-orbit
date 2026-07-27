// Coordination between the boot splash and anything that must not start until
// it is gone.
//
// The splash (components/ui/BootSplash) covers the whole viewport for a
// guaranteed minimum, then fades. Anything on the landing page underneath it
// mounts and starts animating immediately — so the hero's wordmark decode was
// playing out and finishing entirely behind the splash, and by the time the
// splash lifted the word was already sitting there fully rendered.
//
// Two things this has to get right that a bare DOM event would not:
//
//   • A waiter that registers AFTER the splash has already gone must still run.
//     On a soft navigation back to the landing page the splash lives in the
//     persistent layout and never replays, so an event-only listener would wait
//     forever. Hence the latched flag.
//   • It must not touch `window`. This module is imported by client components
//     that are still rendered on the server, and it is unit-tested outside a
//     DOM. A module-level subscriber set needs neither — the splash and its
//     waiters share one module instance in the same bundle.

let done = false;
const waiters = new Set<() => void>();

/** Called by BootSplash once the overlay is actually gone. Idempotent. */
export function markBootSplashDone(): void {
  if (done) return;
  done = true;
  // Copy before iterating: a callback may unsubscribe itself.
  for (const fn of [...waiters]) fn();
  waiters.clear();
}

export function isBootSplashDone(): boolean {
  return done;
}

/**
 * Run `callback` once the splash is gone — immediately if it already is.
 *
 * @param fallbackMs Safety net. If the splash never reports (it isn't mounted
 *   on this route, or `window.load` never fires), run anyway rather than
 *   leaving the caller's animation permanently unstarted.
 * @returns cleanup
 */
export function onBootSplashDone(
  callback: () => void,
  fallbackMs = 6000,
): () => void {
  if (done) {
    callback();
    return () => {};
  }

  let settled = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const fire = () => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    waiters.delete(fire);
    callback();
  };

  timer = setTimeout(fire, fallbackMs);
  waiters.add(fire);

  return () => {
    settled = true;
    if (timer) clearTimeout(timer);
    waiters.delete(fire);
  };
}

/** Test-only: reset the latch and drop any waiters. */
export function __resetBootSplash(): void {
  done = false;
  waiters.clear();
}
