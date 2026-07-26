// Pure fling maths for the coverflow drag gesture, split out from the hook so
// it can be unit-tested without a DOM (same split as lib/glide.ts and
// lib/orbit-trail.ts).

/** How far ahead a release velocity is projected, in ms. */
export const INERTIA_MS = 190;
/** Share of each new sample folded into the smoothed velocity. */
export const VELOCITY_SMOOTHING = 0.32;
/** Ceiling on a single throw, in cards. Keeps a violent swipe from spinning the
 *  row halfway around. */
export const MAX_FLING_CARDS = 3;
/** A pointer that hasn't moved for this long is treated as stationary, so
 *  pressing, dragging, pausing, then releasing does not fling. */
export const STALE_MOVE_MS = 120;

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

/**
 * Fold a new pointer sample into the smoothed velocity.
 *
 * @param previous Smoothed velocity so far, in cards/ms.
 * @param dxPx     Pointer movement since the last sample, in px.
 * @param dtMs     Time since the last sample, in ms.
 * @param spreadPx Centre-to-centre card gap, i.e. px per card.
 * @returns The new smoothed velocity in cards/ms. Positive means the row is
 *          moving toward higher indices (the pointer moved left).
 */
export function accumulateVelocity(
  previous: number,
  dxPx: number,
  dtMs: number,
  spreadPx: number,
): number {
  // A zero/negative dt (two samples in the same ms, or a clock that went
  // backwards) would divide by zero — keep the previous estimate instead.
  if (dtMs <= 0 || spreadPx <= 0) return previous;
  const instant = -dxPx / spreadPx / dtMs;
  return previous * (1 - VELOCITY_SMOOTHING) + instant * VELOCITY_SMOOTHING;
}

/**
 * Where a release should land, before snapping to the nearest whole card.
 *
 * @param target    Current (fractional) focus position, in cards.
 * @param velocity  Smoothed velocity in cards/ms.
 * @param sinceMoveMs Time since the last pointer movement.
 */
export function projectFling(
  target: number,
  velocity: number,
  sinceMoveMs: number,
): number {
  const v = sinceMoveMs > STALE_MOVE_MS ? 0 : velocity;
  return target + clamp(v * INERTIA_MS, -MAX_FLING_CARDS, MAX_FLING_CARDS);
}

/** The card a release settles on. */
export function flingTarget(
  target: number,
  velocity: number,
  sinceMoveMs: number,
): number {
  return Math.round(projectFling(target, velocity, sinceMoveMs));
}
