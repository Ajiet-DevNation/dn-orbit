import { describe, expect, test } from "bun:test";
import {
  arrivalProgress,
  dissolveAt,
  dwellFocus,
  ENTRANCE_PIN_SVH,
  entranceFrame,
  entranceProgress,
  entranceShare,
  hintOpacity,
  ITEM_PIN_SVH,
  pinLengthSvh,
  progressForCard,
  segment,
  splitPin,
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

describe("gallery", () => {
  test("pin grows by one step per extra card", () => {
    expect(pinLengthSvh(1)).toBe(ENTRANCE_PIN_SVH);
    expect(pinLengthSvh(8)).toBe(ENTRANCE_PIN_SVH + 7 * ITEM_PIN_SVH);
  });

  test("the entrance plays first, then the gallery walks 0 → last", () => {
    const share = entranceShare(8);
    expect(splitPin(share / 2, 8)).toEqual({ entrance: 0.5, gallery: 0 });
    expect(splitPin(share, 8).entrance).toBe(1);
    expect(splitPin(share, 8).gallery).toBe(0);
    expect(splitPin(1, 8)).toEqual({ entrance: 1, gallery: 7 });
  });

  test("a single card has no gallery to walk", () => {
    expect(splitPin(1, 1)).toEqual({ entrance: 1, gallery: 0 });
  });

  test("each card holds centre for a beat, then glides to the next", () => {
    expect(dwellFocus(2, 8)).toBe(2);
    expect(dwellFocus(2.15, 8)).toBe(2);
    expect(dwellFocus(2.85, 8)).toBe(3);
    expect(dwellFocus(2.5, 8)).toBeCloseTo(2.5, 10);
    expect(dwellFocus(-1, 8)).toBe(0);
    expect(dwellFocus(9, 8)).toBe(7);
  });

  test("dwell focus is continuous and never moves backwards", () => {
    let prev = 0;
    for (let g = 0; g <= 7; g += 0.01) {
      const f = dwellFocus(g, 8);
      expect(f).toBeGreaterThanOrEqual(prev - 1e-9);
      expect(f - prev).toBeLessThan(0.05);
      prev = f;
    }
  });

  test("progressForCard lands exactly on that card", () => {
    for (let k = 0; k < 8; k++) {
      const { gallery } = splitPin(progressForCard(k, 8), 8);
      expect(dwellFocus(gallery, 8)).toBeCloseTo(k, 6);
    }
  });

  test("scroll hint holds through the pin and fades at the very end", () => {
    expect(hintOpacity(0.5)).toBe(1);
    expect(hintOpacity(1)).toBe(0);
  });
});
