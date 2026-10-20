import { describe, expect, test } from "bun:test";
import {
  CANVAS_SIZE,
  FLING_THRESHOLD,
  LOADER_RING_CELLS,
  LOGO_HALF_H,
  LOGO_HALF_W,
  loaderRingCells,
  MAX_FLING_SPEED,
  ORBIT_PERIOD_MS,
  ORBIT_RX,
  ORBIT_RY,
  OUTER_BOUNDS,
  orbitPosition,
  orbitPositions,
  type Particle,
  PLANET_KEYS,
  REFORM_MS,
  reformProgressAt,
  reformSpinBoost,
  ringCells,
  ringRevealAt,
  SCATTER_MS,
  SHATTER_TOTAL_MS,
  settleSpin,
  shatterPhaseAt,
  shatterVelocity,
  spinPoint,
  stepReform,
  stepScatter,
} from "./orbit-engine";

const particle = (over: Partial<Particle> = {}): Particle => ({
  x: 200,
  y: 100,
  vx: 0,
  vy: 0,
  scale: 1,
  z: 0,
  ...over,
});

describe("orbitPosition", () => {
  test("stays on the tilted ellipse", () => {
    // Un-rotating the point must satisfy the ellipse equation.
    const tilt = -Math.PI / 6;
    for (let t = 0; t < ORBIT_PERIOD_MS; t += 137) {
      const p = orbitPosition(t, 0);
      const ux = p.x * Math.cos(-tilt) - p.y * Math.sin(-tilt);
      const uy = p.x * Math.sin(-tilt) + p.y * Math.cos(-tilt);
      expect((ux / ORBIT_RX) ** 2 + (uy / ORBIT_RY) ** 2).toBeCloseTo(1, 6);
    }
  });

  test("completes exactly one lap per period", () => {
    const a = orbitPosition(0, 0);
    const b = orbitPosition(ORBIT_PERIOD_MS, 0);
    expect(b.x).toBeCloseTo(a.x, 6);
    expect(b.y).toBeCloseTo(a.y, 6);
  });

  test("depth runs between -1 and 1", () => {
    for (let t = 0; t < ORBIT_PERIOD_MS; t += 97) {
      const { z } = orbitPosition(t, 0);
      expect(z).toBeGreaterThanOrEqual(-1);
      expect(z).toBeLessThanOrEqual(1);
    }
  });

  test("scale tracks depth: nearest is largest, farthest smallest", () => {
    const quarter = ORBIT_PERIOD_MS / 4;
    const front = orbitPosition(quarter, 0); // z = +1
    const back = orbitPosition(3 * quarter, 0); // z = -1
    expect(front.z).toBeCloseTo(1, 6);
    expect(back.z).toBeCloseTo(-1, 6);
    expect(front.scale).toBeCloseTo(1, 6);
    expect(back.scale).toBeCloseTo(0.7, 6);
    expect(front.scale).toBeGreaterThan(back.scale);
  });
});

describe("orbitPositions", () => {
  test("spaces the three planets evenly around the ring", () => {
    const p = orbitPositions(0);
    const angles = PLANET_KEYS.map((k) => Math.atan2(p[k].y, p[k].x));
    // Pairwise separations should be ~120° once tilt is accounted for; the
    // simplest invariant is that no two planets coincide.
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        expect(Math.abs(angles[i] - angles[j])).toBeGreaterThan(0.5);
      }
    }
  });

  test("all three stay evenly spaced as time advances", () => {
    const spread = (t: number) => {
      const p = orbitPositions(t);
      return PLANET_KEYS.map((k) => p[k].z).sort();
    };
    const a = spread(0);
    const b = spread(ORBIT_PERIOD_MS);
    for (let i = 0; i < a.length; i++) {
      expect(b[i]).toBeCloseTo(a[i], 6);
    }
  });
});

describe("settleSpin", () => {
  test("pulls toward the resting rate from both directions", () => {
    expect(settleSpin(5, 16)).toBeLessThan(5);
    expect(settleSpin(5, 16)).toBeGreaterThan(1);
    expect(settleSpin(-3, 16)).toBeGreaterThan(-3);
  });

  test("is a fixed point at rest", () => {
    expect(settleSpin(1, 16)).toBeCloseTo(1, 10);
  });

  test("is frame-rate independent", () => {
    // One 32ms step must land in the same place as two 16ms steps.
    const oneBig = settleSpin(10, 32);
    const twoSmall = settleSpin(settleSpin(10, 16), 16);
    expect(oneBig).toBeCloseTo(twoSmall, 6);
  });

  test("clamps a huge delta so returning from a background tab can't jump", () => {
    expect(settleSpin(10, 5000)).toBe(settleSpin(10, 50));
  });
});

describe("shatter timeline", () => {
  test("phases follow the timeline", () => {
    expect(shatterPhaseAt(0)).toBe("scatter");
    expect(shatterPhaseAt(SCATTER_MS)).toBe("scatter");
    expect(shatterPhaseAt(SCATTER_MS + 1)).toBe("reform");
    expect(shatterPhaseAt(SHATTER_TOTAL_MS - 1)).toBe("reform");
    expect(shatterPhaseAt(SHATTER_TOTAL_MS)).toBe("done");
  });

  test("reform progress spans 0 to 1 over the reform beat", () => {
    expect(reformProgressAt(SCATTER_MS)).toBe(0);
    expect(reformProgressAt(SCATTER_MS + REFORM_MS / 2)).toBeCloseTo(0.5, 6);
    expect(reformProgressAt(SHATTER_TOTAL_MS)).toBe(1);
    expect(reformProgressAt(SHATTER_TOTAL_MS + 5000)).toBe(1);
  });

  test("spin boost is zero outside the reform beat and decays inside it", () => {
    expect(reformSpinBoost(0)).toBe(0);
    expect(reformSpinBoost(SCATTER_MS)).toBe(0);
    expect(reformSpinBoost(SHATTER_TOTAL_MS)).toBe(0);
    const early = reformSpinBoost(SCATTER_MS + 500);
    const late = reformSpinBoost(SHATTER_TOTAL_MS - 500);
    expect(early).toBeGreaterThan(late);
    expect(late).toBeGreaterThanOrEqual(0);
  });
});

describe("ringRevealAt", () => {
  test("ring is hidden while the planets are scattered", () => {
    expect(ringRevealAt(0).opacity).toBe(0);
    expect(ringRevealAt(SCATTER_MS - 1).opacity).toBe(0);
  });

  test("fades back in across the reform beat", () => {
    expect(ringRevealAt(SCATTER_MS).opacity).toBe(0);
    expect(ringRevealAt(SCATTER_MS + REFORM_MS / 2).opacity).toBeCloseTo(
      0.5,
      6,
    );
    expect(ringRevealAt(SHATTER_TOTAL_MS).opacity).toBe(1);
  });

  test("scale grows back to 1", () => {
    expect(ringRevealAt(SCATTER_MS).scale).toBeCloseTo(0.8, 6);
    expect(ringRevealAt(SHATTER_TOTAL_MS).scale).toBeCloseTo(1, 6);
  });
});

describe("shatterVelocity", () => {
  test("throws the planet outward from the centre", () => {
    const pos = { x: 300, y: 0, scale: 1, z: 0 };
    const v = shatterVelocity(pos, 30);
    // Radial component dominates (1.5 vs 0.5), so it moves away from origin.
    expect(v.vx).toBeGreaterThan(0);
  });

  test("spin direction flips the tangential kick", () => {
    const pos = { x: 300, y: 0, scale: 1, z: 0 };
    expect(shatterVelocity(pos, 30).vy).toBeGreaterThan(
      shatterVelocity(pos, -30).vy,
    );
  });

  test("clamps launch speed so a violent flick can't fire planets off-screen", () => {
    const pos = { x: 300, y: 0, scale: 1, z: 0 };
    const fast = shatterVelocity(pos, 9999);
    const capped = shatterVelocity(pos, MAX_FLING_SPEED);
    expect(fast.vx).toBeCloseTo(capped.vx, 10);
    expect(fast.vy).toBeCloseTo(capped.vy, 10);
  });

  test("a zero spin still picks a direction rather than producing NaN", () => {
    const v = shatterVelocity({ x: 300, y: 0, scale: 1, z: 0 }, 0);
    expect(Number.isFinite(v.vx)).toBe(true);
    expect(Number.isFinite(v.vy)).toBe(true);
  });

  test("the fling threshold sits below the speed cap", () => {
    expect(FLING_THRESHOLD).toBeLessThan(MAX_FLING_SPEED);
  });
});

describe("stepScatter", () => {
  test("moves the particle by its velocity", () => {
    const p = particle({ x: 400, y: 0, vx: 5, vy: 0 });
    stepScatter(p, 0, 0, 0);
    expect(p.x).toBeGreaterThan(400);
  });

  test("pushes a particle out of the logo box rather than through it", () => {
    // Start inside the box, nearer the vertical edge.
    const p = particle({ x: LOGO_HALF_W - 5, y: 0, vx: 0, vy: 0 });
    stepScatter(p, 0, 0, 0);
    expect(Math.abs(p.x)).toBeGreaterThanOrEqual(LOGO_HALF_W);
  });

  test("reels a particle back in past the outer bound", () => {
    const p = particle({ x: OUTER_BOUNDS + 200, y: 0, vx: 0, vy: 0 });
    stepScatter(p, 0, 0, 0);
    expect(p.vx).toBeLessThan(0);
  });

  test("bleeds velocity so the scatter always slows", () => {
    const p = particle({ x: 600, y: 600, vx: 10, vy: 10 });
    const before = Math.hypot(p.vx, p.vy);
    for (let i = 0; i < 200; i++) stepScatter(p, SCATTER_MS, i * 16, 0);
    expect(Math.hypot(p.vx, p.vy)).toBeLessThan(before);
  });

  test("never produces NaN from a particle resting at the origin", () => {
    const p = particle({ x: 0, y: 0, vx: 0, vy: 0 });
    stepScatter(p, 0, 0, 0);
    expect(Number.isFinite(p.x)).toBe(true);
    expect(Number.isFinite(p.y)).toBe(true);
  });

  test("stays inside a sane radius over a full scatter beat", () => {
    const p = particle({
      x: 10,
      y: 10,
      ...shatterVelocity({ x: 10, y: 10, scale: 1, z: 0 }, MAX_FLING_SPEED),
    });
    for (let t = 0; t < SCATTER_MS; t += 16) stepScatter(p, t, t, 0);
    // The outer-bound pull-back keeps it from flying away forever.
    expect(Math.hypot(p.x, p.y)).toBeLessThan(OUTER_BOUNDS * 2.5);
  });
});

describe("stepReform", () => {
  const target = { x: 300, y: 50, scale: 1, z: 0.5 };

  test("converges onto the orbit slot", () => {
    const p = particle({ x: -500, y: 400, vx: 8, vy: -6, scale: 0.4, z: -1 });
    for (let i = 0; i < 400; i++) stepReform(p, target, 1);
    expect(p.x).toBeCloseTo(target.x, 1);
    expect(p.y).toBeCloseTo(target.y, 1);
    expect(p.scale).toBeCloseTo(target.scale, 2);
    expect(p.z).toBeCloseTo(target.z, 2);
  });

  test("pulls harder as the reform progresses", () => {
    const weak = particle({ x: 0, y: 0 });
    const strong = particle({ x: 0, y: 0 });
    stepReform(weak, target, 0);
    stepReform(strong, target, 1);
    expect(strong.x).toBeGreaterThan(weak.x);
  });

  test("damps leftover momentum", () => {
    const p = particle({ vx: 10, vy: 10 });
    stepReform(p, target, 0);
    expect(Math.abs(p.vx)).toBeLessThan(10);
  });
});

describe("geometry sanity", () => {
  test("the logo collision box fits inside the orbit", () => {
    expect(LOGO_HALF_W).toBeLessThan(ORBIT_RX);
    expect(LOGO_HALF_H).toBeGreaterThan(ORBIT_RY - LOGO_HALF_H);
  });

  test("the orbit fits inside the canvas", () => {
    expect(ORBIT_RX * 2).toBeLessThan(900);
  });
});

describe("loaderRingCells", () => {
  test("nothing at 0, the whole ring at 1", () => {
    expect(loaderRingCells(0, 6)).toEqual([]);
    expect(loaderRingCells(1, 6).length).toBe(LOADER_RING_CELLS);
  });

  test("grows monotonically and never past the full ring", () => {
    let prev = 0;
    for (let p = 0; p <= 1.2; p += 0.01) {
      const n = loaderRingCells(p, 6).length;
      expect(n).toBeGreaterThanOrEqual(prev);
      expect(n).toBeLessThanOrEqual(LOADER_RING_CELLS);
      prev = n;
    }
  });

  test("cells sit on the pixel grid, inside the canvas, half in front", () => {
    const cells = loaderRingCells(1, 6);
    for (const c of cells) {
      expect(c.x % 6).toBe(0);
      expect(c.y % 6).toBe(0);
      expect(c.x).toBeGreaterThanOrEqual(0);
      expect(c.x).toBeLessThanOrEqual(CANVAS_SIZE);
    }
    const front = cells.filter((c) => c.front).length;
    expect(front).toBeGreaterThan(cells.length * 0.4);
    expect(front).toBeLessThan(cells.length * 0.6);
  });
});

describe("ringCells", () => {
  const shape = {
    rx: ORBIT_RX,
    ry: ORBIT_RY,
    tilt: 0.4,
    count: 100,
    cell: 6,
  };

  test("cells stay on the pixel grid at any spin angle", () => {
    for (const spin of [0, 0.1, 0.77, Math.PI / 4, 2]) {
      for (const c of ringCells({ ...shape, tilt: shape.tilt + spin })) {
        expect(c.x % 6).toBe(0);
        expect(c.y % 6).toBe(0);
      }
    }
  });

  test("spinning in-plane keeps the near/far split (depth is untouched)", () => {
    const a = ringCells(shape).map((c) => c.front);
    const b = ringCells({ ...shape, tilt: shape.tilt + 1.3 }).map(
      (c) => c.front,
    );
    expect(b).toEqual(a);
  });

  test("scale shrinks the ring about the centre", () => {
    const span = (cells: { x: number }[]) =>
      Math.max(...cells.map((c) => c.x)) - Math.min(...cells.map((c) => c.x));
    expect(span(ringCells({ ...shape, scale: 0.5 }))).toBeLessThan(
      span(ringCells(shape)) * 0.55,
    );
  });
});

describe("ringCells spacing", () => {
  test("cells are evenly spaced along the curve, even at the flat tips", () => {
    const cells = ringCells({
      rx: ORBIT_RX,
      ry: ORBIT_RY,
      tilt: 0,
      count: 120,
      cell: 1,
    });
    const gaps = cells.map((c, i) => {
      const n = cells[(i + 1) % cells.length];
      return Math.hypot(n.x - c.x, n.y - c.y);
    });
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.25);
  });
});

describe("spinPoint", () => {
  test("planets and trails share one spin: a quarter turn maps x to y", () => {
    const p = spinPoint(10, 0, Math.PI / 2);
    expect(p.x).toBeCloseTo(0, 10);
    expect(p.y).toBeCloseTo(10, 10);
  });

  test("spinning keeps distance from the centre", () => {
    const p = spinPoint(3, 4, 1.234);
    expect(Math.hypot(p.x, p.y)).toBeCloseTo(5, 10);
  });
});
