import { describe, expect, test } from "bun:test";
import {
  LENS_ITEM_GAP,
  lensTilt,
  lensX,
  MAX_TILT_DEG,
  MAX_ZOOM,
  thumbOpacity,
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

describe("thumbOpacity", () => {
  test("solid well inside the loop", () => {
    expect(thumbOpacity(1, 14)).toBe(1);
    expect(thumbOpacity(-4, 14)).toBe(1);
  });

  test("fades to nothing at the loop seam", () => {
    expect(thumbOpacity(7, 14)).toBe(0);
    expect(thumbOpacity(1.5, 3)).toBe(0);
    expect(thumbOpacity(1.25, 3)).toBeCloseTo(0.5, 10);
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
