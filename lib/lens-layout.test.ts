import { describe, expect, test } from "bun:test";
import {
  LENS_HEIGHT_RESERVE,
  LENS_HEIGHT_SHARE,
  LENS_ITEM_GAP,
  lensSize,
  lensTilt,
  lensX,
  MAX_TILT_DEG,
  MAX_ZOOM,
  MIN_LENS_HEIGHT,
  THUMB_REVEAL_SHIFT,
  thumbReveal,
  thumbX,
} from "./lens-layout";

const dims = { lensWidth: 400, thumbWidth: 160, gap: 16 };
const lensEdge = dims.lensWidth / 2;

describe("lensX", () => {
  test("centre card sits at 0, neighbours one lens-width (+gap) away", () => {
    expect(lensX(0, 400)).toBe(0);
    expect(lensX(1, 400)).toBe(400 + LENS_ITEM_GAP);
    expect(lensX(-1, 400)).toBe(-(400 + LENS_ITEM_GAP));
  });
});

describe("thumbX", () => {
  test("first thumb starts one gap past the lens edge on each side", () => {
    expect(thumbX(1, dims) - dims.thumbWidth / 2).toBe(lensEdge + dims.gap);
    expect(thumbX(-1, dims) + dims.thumbWidth / 2).toBe(-(lensEdge + dims.gap));
  });

  test("thumbs step one pitch per item", () => {
    const pitch = dims.thumbWidth + dims.gap;
    expect(thumbX(3, dims) - thumbX(2, dims)).toBe(pitch);
    expect(thumbX(-2, dims) - thumbX(-3, dims)).toBe(pitch);
  });

  test("a thumb about to enter is fully hidden under the lens", () => {
    for (const d of [0.001, -0.001]) {
      const x = thumbX(d, dims);
      expect(Math.abs(x) + dims.thumbWidth / 2).toBeLessThanOrEqual(
        lensEdge + 1,
      );
    }
    expect(thumbX(0, dims)).toBe(0);
  });

  test("moves monotonically through the lens edge (no visible jump)", () => {
    let prev = thumbX(0.05, dims);
    for (let d = 0.1; d <= 3; d += 0.05) {
      const x = thumbX(d, dims);
      expect(x).toBeGreaterThan(prev);
      prev = x;
    }
  });
});

describe("lensTilt", () => {
  test("upright and unzoomed at rest", () => {
    expect(lensTilt(0)).toEqual({ deg: 0, scale: 1 });
  });

  test("tilts toward travel and caps at the lens edge", () => {
    expect(lensTilt(0.5).deg).toBe(MAX_TILT_DEG / 2);
    expect(lensTilt(-1).deg).toBe(-MAX_TILT_DEG);
    expect(lensTilt(4)).toEqual({ deg: MAX_TILT_DEG, scale: 1 + MAX_ZOOM });
  });
});

describe("lensSize", () => {
  const projects = {
    maxWidth: 900,
    ratio: 600 / 680,
    share: 0.46,
    phoneShare: 0.8,
    thumbRatio: 0.36,
  };
  const members = {
    maxWidth: 620,
    ratio: 536 / 392,
    share: 0.36,
    phoneShare: 0.78,
    thumbRatio: 0.36,
  };

  test("fills ~80% of a desktop screen's height, like oryzo", () => {
    const { cardH } = lensSize(1918, 956, members);
    expect(cardH).toBeGreaterThanOrEqual(
      Math.round(956 * LENS_HEIGHT_SHARE) - 1,
    );
    expect(cardH).toBeLessThanOrEqual(Math.round(956 * LENS_HEIGHT_SHARE) + 1);
  });

  test("leaves room for the nav and counter on a short laptop", () => {
    const { cardH } = lensSize(1366, 657, projects);
    expect(cardH).toBeLessThanOrEqual(657 - LENS_HEIGHT_RESERVE + 1);
  });

  test("takes most of a phone's width", () => {
    expect(lensSize(390, 844, projects).cardW).toBe(312);
  });

  test("never collapses below the minimum height", () => {
    expect(lensSize(800, 300, projects).cardH).toBeGreaterThanOrEqual(
      MIN_LENS_HEIGHT - 1,
    );
  });

  test("thumbs are about a third of the lens and keep its aspect", () => {
    const { cardH, thumbW, thumbH } = lensSize(1600, 1000, projects);
    expect(thumbH / cardH).toBeCloseTo(0.36, 2);
    expect(thumbH / thumbW).toBeCloseTo(projects.ratio, 1);
  });
});

describe("thumbReveal", () => {
  test("hidden and pushed out before the strips start", () => {
    expect(thumbReveal(0, 1)).toEqual({
      opacity: 0,
      shift: THUMB_REVEAL_SHIFT,
    });
  });

  test("fully in place once the intro completes, at any distance", () => {
    for (const d of [1, 2, 3, 6]) {
      expect(thumbReveal(1, d)).toEqual({ opacity: 1, shift: 0 });
    }
  });

  test("nearest thumb leads, farther ones follow (stagger, not a pop)", () => {
    const near = thumbReveal(0.3, 1).opacity;
    const next = thumbReveal(0.3, 2).opacity;
    const far = thumbReveal(0.3, 4).opacity;
    expect(near).toBeGreaterThan(next);
    expect(next).toBeGreaterThan(far);
  });

  test("fades in gradually rather than jumping", () => {
    let prev = thumbReveal(0, 1).opacity;
    for (let t = 0.02; t <= 1; t += 0.02) {
      const o = thumbReveal(t, 1).opacity;
      expect(o - prev).toBeLessThan(0.12);
      prev = o;
    }
  });
});
