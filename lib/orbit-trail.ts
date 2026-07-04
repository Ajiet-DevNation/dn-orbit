// Pure math for the hero orbit's 8-bit ghost trail. Kept out of the component
// so the stepped-decay behaviour is unit-testable without canvas/rAF.

export interface TrailParticle {
  x: number;
  y: number;
  bornAt: number;
  /** Emitted while the planet was on the far side of the ring (z ≤ 0). */
  back: boolean;
}

export const TRAIL_MAX_AGE_MS = 500;
/** Hard cap per planet so a long fling can't grow the buffers unbounded. */
export const TRAIL_MAX_PARTICLES = 40;

const ALPHA_STEPS = 4; // discrete 8-bit decay, not a smooth fade
const PEAK_ALPHA = 0.5;

// Baseline orbital speed: ellipse circumference ≈ 2π·avg(410,135) ≈ 1712 px per
// 12000 ms period ≈ 0.143 px/ms. Emit only when meaningfully faster than that —
// drag-flings, the shatter scatter, the reform pull-in — never during calm
// orbiting.
const BASELINE_PX_PER_MS = 0.143;
const EMIT_FACTOR = 1.4;

export function trailAlpha(ageMs: number): number {
  if (ageMs >= TRAIL_MAX_AGE_MS || ageMs < 0) return 0;
  const step = Math.floor((ageMs / TRAIL_MAX_AGE_MS) * ALPHA_STEPS);
  return PEAK_ALPHA * (1 - step / ALPHA_STEPS);
}

export function trailSize(ageMs: number, cell: number): number {
  if (ageMs >= TRAIL_MAX_AGE_MS || ageMs < 0) return 0;
  const step = Math.floor((ageMs / TRAIL_MAX_AGE_MS) * ALPHA_STEPS);
  return cell * (1.5 - (step / ALPHA_STEPS) * 0.75);
}

export function snapToGrid(v: number, cell: number): number {
  return Math.round(v / cell) * cell;
}

export function shouldEmit(distPx: number, deltaMs: number): boolean {
  if (deltaMs <= 0) return false;
  return distPx / deltaMs > BASELINE_PX_PER_MS * EMIT_FACTOR;
}
