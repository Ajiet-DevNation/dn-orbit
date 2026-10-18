// Frame math for horizontal sprite sheets (frame i at backgroundPosition
// i/(n-1) * 100%). Pure, so the stepping rules are unit-tested.

/** Plain loop: 0,1,…,n-1,0,1,… one frame per `stepMs`. */
export function loopFrame(t: number, frames: number, stepMs: number): number {
  return Math.floor(Math.max(0, t) / stepMs) % frames;
}

/**
 * Ping-pong then rest: 0→n-1→0 (no snap back to frame 0), then hold frame 0
 * until `cycleMs` has passed. For generated animations whose last frame
 * doesn't match the first.
 */
export function pingPongFrame(
  t: number,
  frames: number,
  stepMs: number,
  cycleMs: number,
): number {
  const k = Math.floor((Math.max(0, t) % cycleMs) / stepMs);
  const last = frames - 1;
  if (k > last * 2) return 0;
  return k <= last ? k : last * 2 - k;
}

/** CSS backgroundPosition for frame `i` of an `frames`-wide sheet. */
export function framePosition(i: number, frames: number): string {
  return `${frames > 1 ? (i / (frames - 1)) * 100 : 0}% 0`;
}
