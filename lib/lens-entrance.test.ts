import { describe, expect, test } from "bun:test";
import {
  arrivalProgress,
  dissolveAt,
  entranceFrame,
  entranceProgress,
  segment,
  VIEWFINDER_SHARE,
  viewfinderSide,
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

describe("arrivalProgress", () => {
  test("0 at the viewport bottom, 1 once the section reaches the top", () => {
    expect(arrivalProgress(1000, 1000)).toBe(0);
    expect(arrivalProgress(500, 1000)).toBe(0.5);
    expect(arrivalProgress(0, 1000)).toBe(1);
    expect(arrivalProgress(-300, 1000)).toBe(1);
    expect(arrivalProgress(3000, 1000)).toBe(0);
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
  test("pin start: built viewfinder, scroll hint, nothing else yet", () => {
    const f = entranceFrame(0, 1);
    expect(f.dissolve).toBe(1);
    expect(f.open).toBe(0);
    expect(f.blur).toBe(0);
    expect(f.hint).toBe(1);
    expect(f.reticle).toBe(1);
    expect(f.giantOpacity).toBe(0);
    expect(f.heading).toBe(0);
    expect(f.thumbs).toBe(0);
    expect(f.chrome).toBe(0);
  });

  test("the viewfinder content builds while the section arrives", () => {
    expect(entranceFrame(0, 0).dissolve).toBe(0);
    expect(entranceFrame(0, 0.6).dissolve).toBeGreaterThan(0);
    expect(entranceFrame(0, 0.6).dissolve).toBeLessThan(1);
  });

  test("end: full lens, sharp, title in place, strips and controls out", () => {
    expect(entranceFrame(1)).toMatchObject({
      open: 1,
      fly: 1,
      giantOpacity: 0,
      heading: 1,
      hint: 0,
      reticle: 0,
      dissolve: 1,
      thumbs: 1,
      chrome: 1,
    });
    expect(entranceFrame(1).blur).toBeCloseTo(0, 10);
  });

  test("the giant title is solid (never a muddy half-fade) while it crosses", () => {
    for (const p of [0.15, 0.25, 0.4, 0.6, 0.75]) {
      expect(entranceFrame(p).giantOpacity).toBe(1);
    }
  });

  test("focus pull peaks mid-open", () => {
    const mid = entranceFrame(0.45).blur;
    expect(mid).toBeGreaterThan(entranceFrame(0.32).blur);
    expect(mid).toBeGreaterThan(entranceFrame(0.58).blur);
  });

  test("the lens is open before the title lands and the thumbs unfold", () => {
    const f = entranceFrame(0.7);
    expect(f.open).toBe(1);
    expect(f.thumbs).toBe(0);
  });

  test("open, fly and thumbs move monotonically through the pin", () => {
    let prev = entranceFrame(0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const f = entranceFrame(p);
      expect(f.open).toBeGreaterThanOrEqual(prev.open);
      expect(f.fly).toBeGreaterThanOrEqual(prev.fly);
      expect(f.thumbs).toBeGreaterThanOrEqual(prev.thumbs);
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
  test("starts as a square off the lens height and ends at the lens", () => {
    const side = 600 * VIEWFINDER_SHARE;
    expect(viewfinderSide(500, 600)).toBe(side);
    expect(viewfinderSize(0, 500, 600)).toEqual({ width: side, height: side });
    expect(viewfinderSize(1, 500, 600)).toEqual({ width: 500, height: 600 });
  });

  test("never starts wider than a narrow lens", () => {
    expect(viewfinderSide(200, 800)).toBe(200);
  });
});
