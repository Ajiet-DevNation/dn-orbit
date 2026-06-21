import { test, expect } from "bun:test";
import { glideEndpoints } from "./glide";

test("projects (-1) drift net leftward: end x < start x", () => {
  const { fromX, toX } = glideEndpoints(-1, 100);
  expect(fromX).toBe(100);
  expect(toX).toBe(-100);
  expect(toX).toBeLessThan(fromX);
});

test("members (+1) drift net rightward: end x > start x", () => {
  const { fromX, toX } = glideEndpoints(1, 100);
  expect(fromX).toBe(-100);
  expect(toX).toBe(100);
  expect(toX).toBeGreaterThan(fromX);
});

test("endpoints are symmetric around 0 (centre = neutral)", () => {
  const { fromX, toX } = glideEndpoints(1, 75);
  expect(fromX + toX).toBe(0);
});
