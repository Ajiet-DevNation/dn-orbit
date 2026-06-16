import { test, expect } from "bun:test";
import { viewportProgress } from "./parallax";

// viewportProgress(rectTop, rectHeight, viewportHeight) -> signed -1..1.
// -1 when the element sits fully below the viewport, 0 when its centre is at the
// viewport centre, +1 when it has fully passed above. The travel range spans
// (viewportHeight + rectHeight)/2 so 0 lands exactly at centre.

test("centred element returns ~0", () => {
  // element height 400 in a 1000 viewport: centred when top = 300 (centre 500).
  expect(viewportProgress(300, 400, 1000)).toBeCloseTo(0, 5);
});

test("element fully below viewport returns -1", () => {
  // top at viewportHeight (1000) → just entering from bottom → -1.
  expect(viewportProgress(1000, 400, 1000)).toBeCloseTo(-1, 5);
});

test("element fully above viewport returns +1", () => {
  // top = -rectHeight (-400) → just left at top → +1.
  expect(viewportProgress(-400, 400, 1000)).toBeCloseTo(1, 5);
});

test("clamps beyond the travel range", () => {
  expect(viewportProgress(5000, 400, 1000)).toBe(-1);
  expect(viewportProgress(-5000, 400, 1000)).toBe(1);
});

test("guards a zero-size viewport (no NaN)", () => {
  expect(viewportProgress(0, 0, 0)).toBe(0);
});
