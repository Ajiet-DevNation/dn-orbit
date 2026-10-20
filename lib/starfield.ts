// Pure logic for the pixel starfield background (components/ui/PixelStarfield),
// split out so it can be unit-tested without a canvas.
//
// Square pixel stars in three depths drift slowly left at different speeds
// (parallax), a few twinkle in hard steps, a few are violet, and now and then a
// short pixel comet streaks across.

export interface Star {
  x: number;
  y: number;
  /** 0 = far, 1 = mid, 2 = near. */
  layer: 0 | 1 | 2;
  /** Square side, CSS px. */
  size: number;
  /** Leftward drift, CSS px per second. */
  speed: number;
  /** Peak opacity. */
  alpha: number;
  /** Twinkle rate (rad/s); 0 = steady. */
  twinkle: number;
  phase: number;
  violet: boolean;
}

export interface Comet {
  x: number;
  y: number;
  /** Seconds since it appeared. */
  age: number;
}

/** One star per this many CSS px² of screen. */
const AREA_PER_STAR = 5200;
/** Upper bound so a 4K screen doesn't draw thousands of stars. */
export const MAX_STARS = 650;
const LAYER = {
  size: [2, 2, 4],
  speed: [3, 7, 14],
  alpha: [0.22, 0.42, 0.7],
} as const;
/** Share of stars that twinkle / are violet. */
const TWINKLE_SHARE = 0.18;
const VIOLET_SHARE = 0.12;
/** Twinkle brightness steps (hard, pixel-style; no smooth fade). */
const TWINKLE_STEPS = 3;
/** Comets: chance per second, lifetime, velocity (px/s). */
export const COMET_RATE = 0.08;
export const COMET_LIFE_S = 1.4;
export const COMET_VX = 220;
export const COMET_VY = 90;

export type Rand = () => number;

export function starCount(width: number, height: number): number {
  return Math.min(
    MAX_STARS,
    Math.max(0, Math.round((width * height) / AREA_PER_STAR)),
  );
}

export function makeStar(width: number, height: number, rand: Rand): Star {
  const depth = rand();
  const layer: Star["layer"] = depth < 0.6 ? 0 : depth < 0.9 ? 1 : 2;
  return {
    x: rand() * width,
    y: rand() * height,
    layer,
    size: LAYER.size[layer],
    speed: LAYER.speed[layer],
    alpha: LAYER.alpha[layer],
    twinkle: rand() < TWINKLE_SHARE ? 0.6 + rand() * 1.4 : 0,
    phase: rand() * Math.PI * 2,
    violet: rand() < VIOLET_SHARE,
  };
}

export function makeStars(width: number, height: number, rand: Rand): Star[] {
  return Array.from({ length: starCount(width, height) }, () =>
    makeStar(width, height, rand),
  );
}

// fit an existing field to a new screen size without a visible reshuffle:
// stretch positions, then add or drop stars to keep the density
export function resizeStars(
  stars: Star[],
  from: { width: number; height: number },
  to: { width: number; height: number },
  rand: Rand,
): Star[] {
  const sx = from.width > 0 ? to.width / from.width : 1;
  const sy = from.height > 0 ? to.height / from.height : 1;
  const kept = stars.map((s) => ({ ...s, x: s.x * sx, y: s.y * sy }));
  const want = starCount(to.width, to.height);
  if (kept.length > want) return kept.slice(0, want);
  while (kept.length < want) kept.push(makeStar(to.width, to.height, rand));
  return kept;
}

// move every star left by its speed; one that leaves the left edge comes back
// at the right edge on a fresh row
export function stepStars(
  stars: Star[],
  dt: number,
  width: number,
  height: number,
  rand: Rand,
): void {
  for (const s of stars) {
    s.x -= s.speed * dt;
    if (s.x < -s.size) {
      s.x = width + s.size;
      s.y = rand() * height;
    }
  }
}

// current opacity: steady stars hold their peak, twinklers step between
// ~35% and 100% of it
export function starAlpha(star: Star, t: number): number {
  if (!star.twinkle) return star.alpha;
  const wave = (Math.sin(t * star.twinkle + star.phase) + 1) / 2;
  const stepped = Math.round(wave * TWINKLE_STEPS) / TWINKLE_STEPS;
  return star.alpha * (0.35 + 0.65 * stepped);
}

// advance the comet (or maybe spawn one); returns null once it has burnt out
export function stepComet(
  comet: Comet | null,
  dt: number,
  width: number,
  height: number,
  rand: Rand,
): Comet | null {
  if (!comet) {
    return rand() < COMET_RATE * dt
      ? { x: rand() * width, y: rand() * height * 0.5, age: 0 }
      : null;
  }
  const age = comet.age + dt;
  if (age > COMET_LIFE_S) return null;
  return {
    x: comet.x + COMET_VX * dt,
    y: comet.y + COMET_VY * dt,
    age,
  };
}
