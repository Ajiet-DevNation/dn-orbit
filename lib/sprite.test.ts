import { expect, test } from "bun:test";
import { framePosition, loopFrame, pingPongFrame } from "./sprite";

test("loopFrame wraps around", () => {
  const seq = Array.from({ length: 6 }, (_, i) => loopFrame(i * 100, 4, 100));
  expect(seq).toEqual([0, 1, 2, 3, 0, 1]);
});

test("pingPongFrame goes up, comes back down, then rests on 0", () => {
  const seq = Array.from({ length: 12 }, (_, i) =>
    pingPongFrame(i * 10, 5, 10, 120),
  );
  expect(seq).toEqual([0, 1, 2, 3, 4, 3, 2, 1, 0, 0, 0, 0]);
  expect(pingPongFrame(120, 5, 10, 120)).toBe(0); // next cycle starts over
});

test("framePosition spans 0% to 100%", () => {
  expect(framePosition(0, 9)).toBe("0% 0");
  expect(framePosition(8, 9)).toBe("100% 0");
  expect(framePosition(0, 1)).toBe("0% 0");
});
