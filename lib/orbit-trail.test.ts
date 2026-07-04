import { describe, expect, test } from "bun:test";
import {
  shouldEmit,
  snapToGrid,
  TRAIL_MAX_AGE_MS,
  trailAlpha,
  trailSize,
} from "@/lib/orbit-trail";

describe("trailAlpha", () => {
  test("newborn is the strongest step", () => {
    expect(trailAlpha(0)).toBeCloseTo(0.5);
  });

  test("decays in discrete steps, not smoothly", () => {
    expect(trailAlpha(130)).toBeLessThan(trailAlpha(0));
    // 130ms and 200ms sit in the same quarter-life step → identical alpha.
    expect(trailAlpha(130)).toBe(trailAlpha(200));
  });

  test("expired or invalid age renders nothing", () => {
    expect(trailAlpha(TRAIL_MAX_AGE_MS)).toBe(0);
    expect(trailAlpha(TRAIL_MAX_AGE_MS + 1)).toBe(0);
    expect(trailAlpha(-5)).toBe(0);
  });
});

describe("trailSize", () => {
  test("shrinks with age", () => {
    expect(trailSize(400, 8)).toBeLessThan(trailSize(0, 8));
  });

  test("expired is 0", () => {
    expect(trailSize(TRAIL_MAX_AGE_MS, 8)).toBe(0);
  });
});

describe("snapToGrid", () => {
  test("snaps to nearest cell multiple", () => {
    expect(snapToGrid(13, 8)).toBe(16);
    expect(snapToGrid(11, 8)).toBe(8);
    expect(snapToGrid(-13, 8)).toBe(-16);
  });
});

describe("shouldEmit", () => {
  // Baseline orbital speed ≈ 0.14 px/ms → a calm-orbit 16ms frame moves ~2.3px.
  test("calm orbit does not emit", () => {
    expect(shouldEmit(2.3, 16)).toBe(false);
  });

  test("fling emits", () => {
    expect(shouldEmit(12, 16)).toBe(true);
  });

  test("degenerate frame delta never emits", () => {
    expect(shouldEmit(10, 0)).toBe(false);
  });
});
