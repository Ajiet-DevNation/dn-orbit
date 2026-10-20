import { describe, expect, test } from "bun:test";
import {
  dwellFocus,
  ENTRANCE_PIN_SVH,
  entranceFrame,
  entranceProgress,
  entranceShare,
  frameEdges,
  ITEM_PIN_SVH,
  pinLengthSvh,
  progressForCard,
  segment,
  splitPin,
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
  test("pin start: an empty screen — no frame, no picture, no label", () => {
    const f = entranceFrame(0);
    expect(f.giantOpacity).toBe(0);
    expect(f.draw).toBe(0);
    expect(f.frost).toBe(0);
    expect(f.reveal).toBe(0);
    expect(f.heading).toBe(0);
    expect(f.thumbs).toBe(0);
    expect(f.chrome).toBe(0);
    expect(f.hint).toBe(1);
  });

  test("the title parks centre before the frame starts drawing", () => {
    const parked = entranceFrame(0.26);
    expect(parked.giantIn).toBe(1);
    expect(parked.draw).toBe(0);
    expect(parked.fly).toBe(0);
  });

  test("the picture only appears once the frame has closed", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const f = entranceFrame(p);
      if (f.reveal > 0.02) expect(f.draw).toBe(1);
    }
  });

  test("the title only leaves once the picture is coming through", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const f = entranceFrame(p);
      if (f.fly > 0) expect(f.reveal).toBeGreaterThan(0.1);
    }
  });

  test("frost and picture ramp in with no jumps", () => {
    let prev = entranceFrame(0);
    for (let p = 0.005; p <= 1; p += 0.005) {
      const f = entranceFrame(p);
      expect(f.frost - prev.frost).toBeLessThan(0.05);
      expect(f.reveal - prev.reveal).toBeLessThan(0.05);
      prev = f;
    }
  });

  test("the hint is gone before the counter starts to show", () => {
    for (let p = 0; p <= 1; p += 0.01) {
      const f = entranceFrame(p);
      if (f.chrome > 0) expect(f.hint).toBe(0);
    }
  });

  test("end: solid sharp lens, title landed, strips and controls out", () => {
    expect(entranceFrame(1)).toMatchObject({
      giantIn: 1,
      giantOpacity: 0,
      glow: 0,
      draw: 1,
      frost: 1,
      reveal: 1,
      fly: 1,
      heading: 1,
      solid: 1,
      hint: 0,
      thumbs: 1,
      chrome: 1,
    });
  });

  test("the giant title is solid (never a muddy half-fade) while it moves", () => {
    for (const p of [0.1, 0.3, 0.5, 0.7, 0.85]) {
      expect(entranceFrame(p).giantOpacity).toBe(1);
    }
  });

  test("the lens is solid before any thumb starts to fade in beside it", () => {
    const f = entranceFrame(0.86);
    expect(f.solid).toBe(1);
    expect(f.thumbs).toBe(0);
  });

  test("every phase moves monotonically through the pin", () => {
    const keys = [
      "giantIn",
      "draw",
      "frost",
      "reveal",
      "fly",
      "heading",
      "solid",
      "thumbs",
      "chrome",
    ] as const;
    let prev = entranceFrame(0);
    for (let p = 0.01; p <= 1; p += 0.01) {
      const f = entranceFrame(p);
      for (const k of keys) expect(f[k]).toBeGreaterThanOrEqual(prev[k]);
      prev = f;
    }
  });
});

describe("frameEdges", () => {
  test("nothing before the draw, a closed box after it", () => {
    expect(frameEdges(0, 500, 300)).toEqual({ across: 0, down: 0 });
    expect(frameEdges(1, 500, 300)).toEqual({ across: 250, down: 150 });
  });

  test("starts as a chunk-sized corner, then grows in whole chunks", () => {
    expect(frameEdges(0.001, 500, 300, 12)).toEqual({ across: 12, down: 12 });
    const mid = frameEdges(0.5, 500, 300, 12);
    expect(mid.across % 12).toBe(0);
    expect(mid.down % 12).toBe(0);
  });

  test("never overshoots half the box, so opposite sides meet exactly", () => {
    for (let d = 0; d <= 1; d += 0.01) {
      const e = frameEdges(d, 501, 299, 12);
      expect(e.across).toBeLessThanOrEqual(250.5);
      expect(e.down).toBeLessThanOrEqual(149.5);
    }
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
});
