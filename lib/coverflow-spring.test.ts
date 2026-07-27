import { describe, expect, test } from "bun:test";
import {
  isSettled,
  SETTLE_POS_EPS,
  SPRING_STIFFNESS,
  stepSpring,
} from "./coverflow-spring";

/** Run the spring for `ms` in 16ms frames and return the final state. */
function simulate(
  from: { pos: number; vel: number },
  target: number,
  ms: number,
) {
  let s = from;
  for (let t = 0; t < ms; t += 16) s = stepSpring(s, target, 16);
  return s;
}

describe("stepSpring", () => {
  test("moves toward the target", () => {
    const s = stepSpring({ pos: 0, vel: 0 }, 1, 16);
    expect(s.pos).toBeGreaterThan(0);
    expect(s.pos).toBeLessThan(1);
    expect(s.vel).toBeGreaterThan(0);
  });

  test("eases IN — the first frame is slower than the fourth", () => {
    // This is the whole point of the spring over the old exponential lerp,
    // which started at maximum speed.
    const f1 = stepSpring({ pos: 0, vel: 0 }, 1, 16);
    const f2 = stepSpring(f1, 1, 16);
    const f3 = stepSpring(f2, 1, 16);
    const f4 = stepSpring(f3, 1, 16);
    expect(f1.pos - 0).toBeLessThan(f4.pos - f3.pos);
  });

  test("settles on the target inside a second", () => {
    const s = simulate({ pos: 0, vel: 0 }, 1, 800);
    expect(Math.abs(s.pos - 1)).toBeLessThan(SETTLE_POS_EPS);
    expect(isSettled(s, 1)).toBe(true);
  });

  test("critically damped: never overshoots from rest", () => {
    let s = { pos: 0, vel: 0 };
    for (let t = 0; t < 1200; t += 16) {
      s = stepSpring(s, 1, 16);
      expect(s.pos).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  test("carries an injected release velocity past the target's near side", () => {
    // A fling hands its momentum to `vel`; the row must keep travelling rather
    // than stopping dead at the release point.
    const withMomentum = stepSpring({ pos: 0, vel: 6 }, 1, 16);
    const fromRest = stepSpring({ pos: 0, vel: 0 }, 1, 16);
    expect(withMomentum.pos).toBeGreaterThan(fromRest.pos);
  });

  test("a long frame hitch matches several short frames", () => {
    // Sub-stepping is what keeps a dropped frame from visibly jumping.
    const chunked = stepSpring({ pos: 0, vel: 0 }, 1, 48);
    let stepped = { pos: 0, vel: 0 };
    for (let i = 0; i < 3; i++) stepped = stepSpring(stepped, 1, 16);
    expect(chunked.pos).toBeCloseTo(stepped.pos, 3);
  });

  test("degenerate deltas are inert and never produce NaN", () => {
    expect(stepSpring({ pos: 2, vel: 1 }, 5, 0)).toEqual({ pos: 2, vel: 1 });
    expect(stepSpring({ pos: 2, vel: 1 }, 5, -16)).toEqual({ pos: 2, vel: 1 });
    expect(stepSpring({ pos: 2, vel: 1 }, 5, Number.NaN).pos).toBe(2);
  });

  test("stays stable at a stiffness the hook could plausibly pass", () => {
    let s = { pos: 0, vel: 0 };
    for (let t = 0; t < 2000; t += 50) {
      s = stepSpring(s, 1, 50, SPRING_STIFFNESS * 2);
    }
    expect(Number.isFinite(s.pos)).toBe(true);
    expect(s.pos).toBeCloseTo(1, 3);
  });
});

describe("isSettled", () => {
  test("at rest on the target", () => {
    expect(isSettled({ pos: 3, vel: 0 }, 3)).toBe(true);
  });

  test("on the target but still moving is not settled", () => {
    expect(isSettled({ pos: 3, vel: 4 }, 3)).toBe(false);
  });

  test("stopped but off target is not settled", () => {
    expect(isSettled({ pos: 3.4, vel: 0 }, 3)).toBe(false);
  });
});
