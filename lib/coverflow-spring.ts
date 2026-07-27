// Critically-damped spring used by the coverflow carousels, split out from the
// hook so the integrator can be unit-tested without a DOM (same split as
// lib/coverflow-fling.ts).
//
// Why a spring rather than the exponential lerp this replaced: `pos += diff *
// (1 - exp(-dt/tau))` starts at maximum speed and decays forever, so every
// advance began with a jerk and ended with a long crawl — the motion the
// carousels read as "steppy". A spring has a velocity of its own, so it eases
// IN as well as out, and — crucially — a drag release can hand its momentum
// straight to `vel` and the row simply keeps going instead of stopping dead and
// re-accelerating.
//
// Units: `pos` is in cards, `vel` in cards per SECOND (per-second keeps the
// stiffness/damping numbers readable), `dtMs` in milliseconds.

/** ω² for the spring. ω = 14 rad/s settles a one-card move in ~470ms. */
export const SPRING_STIFFNESS = 196;
/** Integrator sub-step. Small enough that semi-implicit Euler stays stable and
 *  a 50ms hitch resolves identically to three 16ms frames. */
const MAX_SUBSTEP_MS = 4;
/** Below this distance AND velocity the motion is over. */
export const SETTLE_POS_EPS = 0.0015;
const SETTLE_VEL_EPS = 0.02;

export interface SpringState {
  /** Position, in cards. */
  pos: number;
  /** Velocity, in cards per second. */
  vel: number;
}

/**
 * Advance a critically-damped spring toward `target`.
 *
 * Critically damped (damping = 2√k) is deliberate: it is the fastest approach
 * that cannot overshoot, so a card never bounces past centre and back.
 */
export function stepSpring(
  state: SpringState,
  target: number,
  dtMs: number,
  stiffness: number = SPRING_STIFFNESS,
): SpringState {
  // A zero, negative or non-finite frame delta must not move the system (and
  // must never produce NaN, which would poison every later frame).
  if (!Number.isFinite(dtMs) || dtMs <= 0) return { ...state };

  const damping = 2 * Math.sqrt(stiffness);
  const steps = Math.max(1, Math.ceil(dtMs / MAX_SUBSTEP_MS));
  const h = dtMs / steps / 1000; // seconds per sub-step

  let { pos, vel } = state;
  for (let i = 0; i < steps; i++) {
    // Semi-implicit Euler: integrate velocity first, then position with the
    // NEW velocity. Unconditionally stable at these sub-step sizes, unlike the
    // explicit form, which slowly gains energy.
    vel += (-stiffness * (pos - target) - damping * vel) * h;
    pos += vel * h;
  }
  return { pos, vel };
}

/** True once the spring is close enough to `target`, and slow enough, to stop. */
export function isSettled(state: SpringState, target: number): boolean {
  return (
    Math.abs(state.pos - target) < SETTLE_POS_EPS &&
    Math.abs(state.vel) < SETTLE_VEL_EPS
  );
}
