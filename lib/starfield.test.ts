import { describe, expect, test } from "bun:test";
import {
  COMET_LIFE_S,
  MAX_STARS,
  makeStars,
  resizeStars,
  starAlpha,
  starCount,
  stepComet,
  stepStars,
} from "./starfield";

// Small deterministic PRNG so the tests don't depend on Math.random.
function seeded(seed = 42) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe("starCount", () => {
  test("scales with screen area", () => {
    expect(starCount(1280, 720)).toBeGreaterThan(starCount(640, 360));
    expect(starCount(0, 900)).toBe(0);
  });

  test("is capped on very large screens", () => {
    expect(starCount(3840, 2160)).toBe(MAX_STARS);
  });
});

describe("makeStars", () => {
  test("every star starts on screen with sane values", () => {
    const stars = makeStars(1280, 720, seeded());
    expect(stars.length).toBe(starCount(1280, 720));
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(0);
      expect(s.x).toBeLessThanOrEqual(1280);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(720);
      expect(s.alpha).toBeGreaterThan(0);
      expect(s.alpha).toBeLessThanOrEqual(1);
    }
  });

  test("nearer stars are bigger, faster and brighter (parallax)", () => {
    const stars = makeStars(1920, 1080, seeded());
    const by = (l: number) => stars.find((s) => s.layer === l);
    const far = by(0);
    const near = by(2);
    expect(far && near).toBeTruthy();
    if (!far || !near) return;
    expect(near.size).toBeGreaterThan(far.size);
    expect(near.speed).toBeGreaterThan(far.speed);
    expect(near.alpha).toBeGreaterThan(far.alpha);
  });
});

describe("stepStars", () => {
  test("stars drift left and wrap back in at the right edge", () => {
    const rand = seeded();
    const stars = makeStars(800, 600, rand);
    for (let i = 0; i < 2000; i++) stepStars(stars, 0.1, 800, 600, rand);
    for (const s of stars) {
      expect(s.x).toBeGreaterThanOrEqual(-s.size);
      expect(s.x).toBeLessThanOrEqual(800 + s.size);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(600);
    }
  });
});

describe("resizeStars", () => {
  test("keeps the density and keeps everyone on the new screen", () => {
    const rand = seeded();
    const stars = makeStars(1280, 720, rand);
    const grown = resizeStars(
      stars,
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
      rand,
    );
    expect(grown.length).toBe(starCount(1920, 1080));
    const shrunk = resizeStars(
      grown,
      { width: 1920, height: 1080 },
      { width: 390, height: 844 },
      rand,
    );
    expect(shrunk.length).toBe(starCount(390, 844));
    for (const s of shrunk) {
      expect(s.x).toBeLessThanOrEqual(390);
      expect(s.y).toBeLessThanOrEqual(844);
    }
  });
});

describe("starAlpha", () => {
  test("steady stars hold their peak", () => {
    const [s] = makeStars(800, 600, seeded()).filter((x) => !x.twinkle);
    expect(s && starAlpha(s, 3.7)).toBe(s?.alpha);
  });

  test("twinklers step between a floor and their peak", () => {
    const stars = makeStars(1920, 1080, seeded()).filter((x) => x.twinkle);
    expect(stars.length).toBeGreaterThan(0);
    for (const s of stars) {
      const seen = new Set<number>();
      for (let t = 0; t < 20; t += 0.05) {
        const a = starAlpha(s, t);
        expect(a).toBeGreaterThanOrEqual(s.alpha * 0.35 - 1e-9);
        expect(a).toBeLessThanOrEqual(s.alpha + 1e-9);
        seen.add(Math.round(a * 1e6));
      }
      // Hard steps, not a smooth fade: only a handful of distinct levels.
      expect(seen.size).toBeLessThanOrEqual(4);
    }
  });
});

describe("stepComet", () => {
  test("a comet moves down-right and burns out after its lifetime", () => {
    let comet: ReturnType<typeof stepComet> = { x: 100, y: 100, age: 0 };
    const rand = seeded();
    comet = stepComet(comet, 0.5, 800, 600, rand);
    expect(comet?.x).toBeGreaterThan(100);
    expect(comet?.y).toBeGreaterThan(100);
    comet = stepComet(comet, COMET_LIFE_S, 800, 600, rand);
    expect(comet).toBeNull();
  });

  test("with no comet, one only spawns now and then", () => {
    const rand = seeded();
    let spawned = 0;
    for (let i = 0; i < 3000; i++) {
      if (stepComet(null, 1 / 30, 800, 600, rand)) spawned++;
    }
    // ~0.08/s over 100s ≈ 8 spawns.
    expect(spawned).toBeGreaterThan(0);
    expect(spawned).toBeLessThan(30);
  });
});
