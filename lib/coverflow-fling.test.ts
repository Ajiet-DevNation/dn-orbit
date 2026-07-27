import { describe, expect, test } from "bun:test";
import {
  accumulateVelocity,
  flingTarget,
  INERTIA_MS,
  MAX_FLING_CARDS,
  MAX_RELEASE_VELOCITY,
  projectFling,
  releaseVelocity,
  STALE_MOVE_MS,
} from "./coverflow-fling";

describe("accumulateVelocity", () => {
  test("a leftward drag produces positive velocity (row advances)", () => {
    // Pointer moved 40px left over 16ms with a 400px card gap.
    expect(accumulateVelocity(0, -40, 16, 400)).toBeGreaterThan(0);
  });

  test("a rightward drag produces negative velocity", () => {
    expect(accumulateVelocity(0, 40, 16, 400)).toBeLessThan(0);
  });

  test("smooths toward the instantaneous value rather than jumping to it", () => {
    const instant = 40 / 400 / 16;
    const once = accumulateVelocity(0, -40, 16, 400);
    expect(once).toBeCloseTo(instant * 0.32, 10);
    // Repeated identical samples converge on the instantaneous value.
    let v = 0;
    for (let i = 0; i < 40; i++) v = accumulateVelocity(v, -40, 16, 400);
    expect(v).toBeCloseTo(instant, 4);
  });

  test("one jittery sample cannot dominate", () => {
    let steady = 0;
    for (let i = 0; i < 20; i++)
      steady = accumulateVelocity(steady, -20, 16, 400);
    const spiked = accumulateVelocity(steady, -400, 16, 400);
    // The spike is 20x the steady sample but moves the estimate by well under
    // that, because only 32% of it is folded in.
    expect(spiked).toBeLessThan(steady * 8);
  });

  test("a non-positive dt keeps the previous estimate instead of dividing by zero", () => {
    expect(accumulateVelocity(0.5, -40, 0, 400)).toBe(0.5);
    expect(accumulateVelocity(0.5, -40, -3, 400)).toBe(0.5);
    expect(Number.isFinite(accumulateVelocity(0.5, -40, 0, 400))).toBe(true);
  });

  test("a zero spread keeps the previous estimate", () => {
    expect(accumulateVelocity(0.5, -40, 16, 0)).toBe(0.5);
  });
});

describe("releaseVelocity", () => {
  test("passes an ordinary release through untouched", () => {
    expect(releaseVelocity(0.005, 0)).toBe(0.005);
    expect(releaseVelocity(-0.005, 10)).toBe(-0.005);
  });

  test("a stale pointer releases at rest", () => {
    expect(releaseVelocity(0.05, STALE_MOVE_MS + 1)).toBe(0);
  });

  test("bounds a spike in both directions", () => {
    expect(releaseVelocity(99, 0)).toBe(MAX_RELEASE_VELOCITY);
    expect(releaseVelocity(-99, 0)).toBe(-MAX_RELEASE_VELOCITY);
  });

  test("a non-finite estimate releases at rest", () => {
    expect(releaseVelocity(Number.NaN, 0)).toBe(0);
    expect(releaseVelocity(Number.POSITIVE_INFINITY, 0)).toBe(0);
  });
});

describe("projectFling", () => {
  test("carries momentum past the current position", () => {
    const projected = projectFling(4, 0.005, 0);
    expect(projected).toBeCloseTo(4 + 0.005 * INERTIA_MS, 10);
    expect(projected).toBeGreaterThan(4);
  });

  test("a stationary release does not move", () => {
    expect(projectFling(4, 0, 0)).toBe(4);
  });

  test("a stale pointer does not fling", () => {
    // Press, drag fast, pause, then release: the old velocity must not apply.
    expect(projectFling(4, 0.05, STALE_MOVE_MS + 1)).toBe(4);
    expect(projectFling(4, 0.05, STALE_MOVE_MS)).toBeGreaterThan(4);
  });

  test("caps a violent throw in both directions", () => {
    expect(projectFling(0, 99, 0)).toBe(MAX_FLING_CARDS);
    expect(projectFling(0, -99, 0)).toBe(-MAX_FLING_CARDS);
  });

  test("works from a negative position (the ring wraps below zero)", () => {
    expect(projectFling(-7, 99, 0)).toBe(-7 + MAX_FLING_CARDS);
  });
});

describe("flingTarget", () => {
  test("snaps to a whole card", () => {
    expect(Number.isInteger(flingTarget(4.3, 0.004, 0))).toBe(true);
  });

  test("a slow release still snaps to the nearest card", () => {
    expect(flingTarget(4.4, 0, 0)).toBe(4);
    expect(flingTarget(4.6, 0, 0)).toBe(5);
  });

  test("a fast flick advances further than a slow one", () => {
    const slow = flingTarget(4, 0.002, 0);
    const fast = flingTarget(4, 0.012, 0);
    expect(fast).toBeGreaterThan(slow);
  });
});
