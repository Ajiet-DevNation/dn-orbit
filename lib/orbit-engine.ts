// Pure orbit physics for the DN logo hero.
//
// Extracted from PixelLoadingScreen so the maths can be unit-tested without a
// DOM and shared by both shells (the landing hero and the boot overlay). Nothing
// here touches React, canvas or the document — callers own the rendering and
// pass state in and out.
//
// The numbers are carried over unchanged from the original inline
// implementation; this is a move, not a retune.

// ─── Geometry ────────────────────────────────────────────────────────────────

export const CANVAS_SIZE = 900;
export const ORBIT_RX = 410;
export const ORBIT_RY = 135;
export const ORBIT_TILT = -Math.PI / 6;
export const PLANET_ICON_SIZE = 55;

/** One shared period keeps the three planets evenly spaced forever. */
export const ORBIT_PERIOD_MS = 12_000;

export const PLANET_KEYS = ["github", "leetcode", "linkedin"] as const;
export type PlanetKey = (typeof PLANET_KEYS)[number];

/** Even thirds around the ellipse. */
const PLANET_PHASE: Record<PlanetKey, number> = {
  github: 0,
  leetcode: (Math.PI * 2) / 3,
  linkedin: (Math.PI * 4) / 3,
};

// ─── Shatter timeline ────────────────────────────────────────────────────────

export const SCATTER_MS = 6_000;
export const REFORM_MS = 11_000;
export const SHATTER_TOTAL_MS = SCATTER_MS + REFORM_MS;

/** Half-extents of the logo's collision box — particles bounce off it. */
export const LOGO_HALF_W = 330;
export const LOGO_HALF_H = 150;
/** Beyond this radius particles are pulled back toward the centre. */
export const OUTER_BOUNDS = 400;

export type ShatterPhase = "scatter" | "reform" | "done";

export function shatterPhaseAt(elapsedMs: number): ShatterPhase {
  if (elapsedMs >= SHATTER_TOTAL_MS) return "done";
  return elapsedMs > SCATTER_MS ? "reform" : "scatter";
}

/** 0 → 1 across the reform beat; 0 while still scattering. */
export function reformProgressAt(elapsedMs: number): number {
  if (elapsedMs <= SCATTER_MS) return 0;
  return Math.min((elapsedMs - SCATTER_MS) / REFORM_MS, 1);
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OrbitPosition {
  x: number;
  y: number;
  scale: number;
  /** Fake depth: +1 at the front of the ring, -1 at the back. */
  z: number;
}

export interface Particle extends OrbitPosition {
  vx: number;
  vy: number;
}

// ─── Steady orbit ────────────────────────────────────────────────────────────

/**
 * Where a planet sits on the tilted ellipse at a given accumulated time.
 *
 * The ellipse is computed axis-aligned then rotated by ORBIT_TILT, and `z` is
 * the raw sine — the isometric depth trick that drives per-planet scale, opacity
 * and z-index.
 */
export function orbitPosition(
  accumulatedTime: number,
  offset: number,
  period: number = ORBIT_PERIOD_MS,
): OrbitPosition {
  const angle =
    ((accumulatedTime / period) * Math.PI * 2 + offset) % (Math.PI * 2);
  const unX = ORBIT_RX * Math.cos(angle);
  const unY = ORBIT_RY * Math.sin(angle);
  return {
    x: unX * Math.cos(ORBIT_TILT) - unY * Math.sin(ORBIT_TILT),
    y: unX * Math.sin(ORBIT_TILT) + unY * Math.cos(ORBIT_TILT),
    z: Math.sin(angle),
    scale: 0.7 + 0.3 * ((Math.sin(angle) + 1) / 2),
  };
}

// turn a point in the ring's own frame by the ring's spin about the view axis;
// planets AND their trails go through this, so the two can never drift apart
export function spinPoint(
  x: number,
  y: number,
  angle: number,
): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/** All three planets at once. */
export function orbitPositions(
  accumulatedTime: number,
): Record<PlanetKey, OrbitPosition> {
  return {
    github: orbitPosition(accumulatedTime, PLANET_PHASE.github),
    leetcode: orbitPosition(accumulatedTime, PLANET_PHASE.leetcode),
    linkedin: orbitPosition(accumulatedTime, PLANET_PHASE.linkedin),
  };
}

/**
 * Ease the spin back toward its resting rate (1x).
 *
 * Frame-rate independent: the original per-frame 0.05 factor is renormalised to
 * the real delta so a 120Hz display settles at the same wall-clock rate as 60Hz.
 */
export function settleSpin(spinVelocity: number, deltaMs: number): number {
  const k = 1 - (1 - 0.05) ** (Math.min(deltaMs, 50) / (1000 / 60));
  return spinVelocity + (1 - spinVelocity) * k;
}

/** Extra spin injected during the reform beat, decaying as it completes. */
export function reformSpinBoost(elapsedMs: number): number {
  if (elapsedMs <= SCATTER_MS || elapsedMs >= SHATTER_TOTAL_MS) return 0;
  return (1 - reformProgressAt(elapsedMs)) ** 2 * 12;
}

// ─── Shatter ─────────────────────────────────────────────────────────────────

/** Fling threshold — a release slower than this just settles. */
export const FLING_THRESHOLD = 16;
/** Spin speed is clamped before it becomes launch velocity. */
export const MAX_FLING_SPEED = 40;

/**
 * Launch velocity for one planet when the ring is flung apart: mostly radially
 * outward with a tangential kick in the direction of spin.
 */
export function shatterVelocity(
  pos: OrbitPosition,
  spinVelocity: number,
): { vx: number; vy: number } {
  const speed = Math.min(Math.abs(spinVelocity), MAX_FLING_SPEED);
  const dir = Math.sign(spinVelocity) || 1;
  const angle = Math.atan2(pos.y, pos.x);
  const tangent = angle + (dir * Math.PI) / 2;
  return {
    vx: (Math.cos(tangent) * 0.5 + Math.cos(angle) * 1.5) * speed * 0.4,
    vy: (Math.sin(tangent) * 0.5 + Math.sin(angle) * 1.5) * speed * 0.4,
  };
}

/**
 * Advance a particle through the scatter beat: drift outward, wobble, bounce off
 * the logo box, get reeled in past the outer bound, and drag toward rest.
 *
 * Mutates `p` — this runs three times per frame and allocating here would churn
 * the GC for no benefit.
 */
export function stepScatter(
  p: Particle,
  elapsedMs: number,
  nowMs: number,
  index: number,
): void {
  p.x += p.vx;
  p.y += p.vy;

  const dist = Math.hypot(p.x, p.y) || 1;

  const pushStrength = 0.04 * (1 - elapsedMs / SCATTER_MS);
  p.vx += (p.x / dist) * pushStrength;
  p.vy += (p.y / dist) * pushStrength;

  p.x += Math.sin(nowMs / 500 + index) * 0.8;
  p.y += Math.cos(nowMs / 400 + index) * 0.8;

  // Bounce off the logo's box, resolving on whichever edge is nearer.
  if (Math.abs(p.x) < LOGO_HALF_W && Math.abs(p.y) < LOGO_HALF_H) {
    const toX = LOGO_HALF_W - Math.abs(p.x);
    const toY = LOGO_HALF_H - Math.abs(p.y);
    if (toX < toY) {
      p.x = Math.sign(p.x) * LOGO_HALF_W;
      p.vx *= -0.9;
    } else {
      p.y = Math.sign(p.y) * LOGO_HALF_H;
      p.vy *= -0.9;
    }
  }

  if (dist > OUTER_BOUNDS) {
    p.vx -= (p.x / dist) * 0.3;
    p.vy -= (p.y / dist) * 0.3;
  }

  p.vx *= 0.98;
  p.vy *= 0.98;
  p.scale += (1 - p.scale) * 0.02;
  p.z += (0 - p.z) * 0.02;
}

/**
 * Advance a particle through the reform beat: momentum bleeds off while an
 * increasingly strong spring pulls it back onto its orbit slot.
 *
 * Mutates `p`.
 */
export function stepReform(
  p: Particle,
  target: OrbitPosition,
  reformProgress: number,
): void {
  p.vx *= 0.85;
  p.vy *= 0.85;
  p.x += p.vx;
  p.y += p.vy;

  const pull = 0.005 + reformProgress ** 2 * 0.2;
  p.x += (target.x - p.x) * pull;
  p.y += (target.y - p.y) * pull;
  p.z += (target.z - p.z) * pull;
  p.scale += (target.scale - p.scale) * pull;
}

// ─── Ring reveal during the shatter ──────────────────────────────────────────

/** Ring opacity/scale while the planets are away, so it fades out and back in. */
export function ringRevealAt(elapsedMs: number): {
  opacity: number;
  scale: number;
} {
  if (elapsedMs < SCATTER_MS) return { opacity: 0, scale: 1 };
  const progress = Math.min((elapsedMs - SCATTER_MS) / REFORM_MS, 1);
  return {
    opacity: progress,
    scale: 0.8 + 0.2 * (1 - (1 - progress) ** 3),
  };
}

// ─── Easing ──────────────────────────────────────────────────────────────────

export function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

// ─── Pixel rings ─────────────────────────────────────────────────────────────
// Both landing rings and the loading ring are chains of square pixel cells
// rather than stroked ellipses. Spin is applied here, in maths, instead of by
// rotating the painted canvas, so every cell stays an axis-aligned square on
// the pixel grid at any angle.

export interface RingCell {
  /** Canvas coords (0..CANVAS_SIZE), snapped to the pixel grid. */
  x: number;
  y: number;
  /** On the near half of the ring (drawn in front of the logo). */
  front: boolean;
}

export interface RingShape {
  rx: number;
  ry: number;
  /** In-plane rotation of the ellipse (tilt plus any spin), radians. */
  tilt: number;
  /** Cells around the full ring. */
  count: number;
  /** Pixel grid the cells snap to. */
  cell: number;
  /** Uniform scale about the canvas centre (entrance / shatter reveal). */
  scale?: number;
}

// ellipse parameters for `count` points spaced evenly by ARC LENGTH. Evenly
// spaced angles bunch up at the two tips of a flat ellipse (there the curve
// covers little ground per radian), which drew the pixel rings as solid bars.
const arcCache = new Map<string, number[]>();
const ARC_SAMPLES = 2048;
function evenArcParams(
  rx: number,
  ry: number,
  count: number,
  start: number,
): number[] {
  const key = `${rx}|${ry}|${count}|${start}`;
  const hit = arcCache.get(key);
  if (hit) return hit;
  const lengths = [0];
  let prevX = rx * Math.cos(start);
  let prevY = ry * Math.sin(start);
  for (let j = 1; j <= ARC_SAMPLES; j++) {
    const a = start + (j / ARC_SAMPLES) * Math.PI * 2;
    const x = rx * Math.cos(a);
    const y = ry * Math.sin(a);
    lengths.push(lengths[j - 1] + Math.hypot(x - prevX, y - prevY));
    prevX = x;
    prevY = y;
  }
  const total = lengths[ARC_SAMPLES];
  const params: number[] = [];
  let j = 0;
  for (let i = 0; i < count; i++) {
    const want = (i / count) * total;
    while (lengths[j + 1] < want) j++;
    const seg = lengths[j + 1] - lengths[j] || 1;
    const t = (j + (want - lengths[j]) / seg) / ARC_SAMPLES;
    params.push(start + t * Math.PI * 2);
  }
  arcCache.set(key, params);
  return params;
}

// cells of a tilted ellipse, evenly spaced along the curve, starting at
// parameter `start` and going round; `progress` 0..1 says how much exists
export function ringCells(
  { rx, ry, tilt, count, cell, scale = 1 }: RingShape,
  progress = 1,
  start = 0,
): RingCell[] {
  const shown = Math.round(Math.min(1, Math.max(0, progress)) * count);
  const params = evenArcParams(rx, ry, count, start);
  const c = CANVAS_SIZE / 2;
  const cos = Math.cos(tilt);
  const sin = Math.sin(tilt);
  const cells: RingCell[] = [];
  for (let i = 0; i < shown; i++) {
    const a = params[i];
    const ux = rx * Math.cos(a);
    const uy = ry * Math.sin(a);
    cells.push({
      x: Math.round((c + (ux * cos - uy * sin) * scale) / cell) * cell,
      y: Math.round((c + (ux * sin + uy * cos) * scale) / cell) * cell,
      front: Math.sin(a) > 0,
    });
  }
  return cells;
}

/** Cells around the full loading ring (the main orbit). */
export const LOADER_RING_CELLS = 120;
/** Where the loading ring starts drawing: the far left of the ellipse. */
const LOADER_START = Math.PI;

// the main ring as the loader draws it, from the far left round the back
export function loaderRingCells(progress: number, cell: number): RingCell[] {
  return ringCells(
    {
      rx: ORBIT_RX,
      ry: ORBIT_RY,
      tilt: ORBIT_TILT,
      count: LOADER_RING_CELLS,
      cell,
    },
    progress,
    LOADER_START,
  );
}
