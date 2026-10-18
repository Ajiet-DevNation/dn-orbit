import { describe, expect, test } from "bun:test";
import {
  DISSOLVE_PREVIEW,
  dissolveAt,
  entranceFrame,
  entranceProgress,
  MAX_BLUR_PX,
  segment,
  VIEWFINDER_SHARE,
  viewfinderSize,
} from "./lens-entrance";

describe("entranceProgress", () => {
  test("0 when the pin starts, 1 when it ends", () => {
    // Section 2100px tall in a 1000px viewport → 1100px of pinned travel.
    expect(entranceProgress(0, 2100, 1000)).toBe(0);
    expect(entranceProgress(-550, 2100, 1000)).toBe(0.5);
    expect(entranceProgress(-1100, 2100, 1000)).toBe(1);
  });

  test("clamps before and after the pin", () => {
    expect(entranceProgress(400, 2100, 1000)).toBe(0);
    expect(entranceProgress(-5000, 2100, 1000)).toBe(1);
  });

  test("an unpinned (reduced-motion) section is simply done", () => {
    expect(entranceProgress(300, 900, 1000)).toBe(1);
  });
});

describe("segment", () => {
  test("maps a window to 0→1 and clamps outside it", () => {
    expect(segment(0.2, 0.2, 0.4)).toBe(0);
    expect(segment(0.3, 0.2, 0.4)).toBeCloseTo(0.5, 10);
    expect(segment(0.9, 0.2, 0.4)).toBe(1);
  });
});

describe("entranceFrame", () => {
  test("start: small viewfinder with a preview glimpse, nothing else", () => {
    const f = entranceFrame(0);
    expect(f.open).toBe(0);
    expect(f.giantOpacity).toBe(0);
    expect(f.heading).toBe(0);
    expect(f.thumbs).toBe(0);
    expect(f.chrome).toBe(0);
    expect(f.hint).toBe(1);
    expect(f.reticle).toBe(1);
    expect(f.dissolve).toBe(DISSOLVE_PREVIEW);
    expect(f.blur).toBe(MAX_BLUR_PX);
  });

  test("end: full lens, sharp, heading in place, strips and controls out", () => {
    const f = entranceFrame(1);
    expect(f).toMatchObject({
      open: 1,
      fly: 1,
      giantOpacity: 0,
      heading: 1,
      hint: 0,
      reticle: 0,
      dissolve: 1,
      blur: 0,
      thumbs: 1,
      chrome: 1,
    });
  });

  test("the lens is open and sharp before the thumbs unfold", () => {
    const atThumbsStart = entranceFrame(0.66);
    expect(atThumbsStart.open).toBe(1);
    expect(atThumbsStart.dissolve).toBe(1);
    expect(atThumbsStart.thumbs).toBe(0);
  });

  test("giant title is fully visible mid-flight and gone once the heading shows", () => {
    expect(entranceFrame(0.6).giantOpacity).toBe(1);
    expect(entranceFrame(0.78).giantOpacity).toBe(0);
    expect(entranceFrame(0.78).heading).toBe(1);
  });

  test("every channel moves monotonically through the pin", () => {
    let prev = entranceFrame(0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const f = entranceFrame(p);
      expect(f.open).toBeGreaterThanOrEqual(prev.open);
      expect(f.fly).toBeGreaterThanOrEqual(prev.fly);
      expect(f.dissolve).toBeGreaterThanOrEqual(prev.dissolve);
      expect(f.thumbs).toBeGreaterThanOrEqual(prev.thumbs);
      expect(f.blur).toBeLessThanOrEqual(prev.blur);
      prev = f;
    }
  });
});

describe("dissolveAt", () => {
  test("deterministic and inside [0, 1)", () => {
    for (let i = 0; i < 300; i++) {
      const t = dissolveAt(i);
      expect(t).toBeGreaterThanOrEqual(0);
      expect(t).toBeLessThan(1);
      expect(dissolveAt(i)).toBe(t);
    }
  });
});

describe("viewfinderSize", () => {
  test("starts as a square off the shorter side and ends at the lens", () => {
    expect(viewfinderSize(0, 400, 600)).toEqual({
      width: 400 * VIEWFINDER_SHARE,
      height: 400 * VIEWFINDER_SHARE,
    });
    expect(viewfinderSize(1, 400, 600)).toEqual({ width: 400, height: 600 });
  });
});
