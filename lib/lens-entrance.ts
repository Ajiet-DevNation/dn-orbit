// Pure choreography for the lens sections' scroll entrance (Projects /
// Members), split out from hooks/useLensScroll.ts so it can be unit-tested
// without a DOM.
//
// Scroll-scrubbed, in order:
//   title   — the giant title slides in from the right and parks dead centre;
//   box     — the lens frame draws itself: all four sides grow out of the
//             corners in chunky pixel steps until they meet;
//   picture — the glass frosts over (blurring the title behind it) and the
//             first card blurs in; as it sharpens, the title shrinks behind
//             the lens into its label on the left;
//   gallery — thumbs and controls fade in, then (still pinned) scrolling walks
//             the lens through the cards one by one, each holding for a beat.

/** Pinned scroll the entrance plays over (svh). */
export const ENTRANCE_PIN_SVH = 180;
/** Pinned scroll per gallery step once the lens is formed (svh). */
export const ITEM_PIN_SVH = 60;
/** Share of each gallery step a card holds still at centre, per side. */
const DWELL = 0.2;
/** Frosted-glass blur the lens applies to whatever sits behind it. */
export const LENS_FROST = "blur(14px) saturate(130%)";
/** Blur on the first card the moment it starts to appear, px. */
export const REVEAL_BLUR_PX = 16;
/** Extra scale on the first card as it starts to appear (settles to 1). */
export const REVEAL_ZOOM = 0.04;
/** Pixel step the frame's sides grow by while drawing, px. */
export const EDGE_CHUNK_PX = 12;

function clamp01(n: number): number {
  // `<=` also folds -0 (from -rectTop at exactly 0) into a plain 0.
  return n <= 0 ? 0 : n > 1 ? 1 : n;
}

// local 0→1 progress of p inside [a, b]
export function segment(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a));
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const smootherstep = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2;

// pin progress from the section's live rect: 0 as it sticks, 1 as it unsticks
export function entranceProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number,
): number {
  const travel = rectHeight - viewportHeight;
  if (travel <= 0) return 1;
  return clamp01(-rectTop / travel);
}

export interface EntranceFrame {
  /** Giant title slide-in from the right (0 = off-screen, 1 = parked centre). */
  giantIn: number;
  /** Giant title opacity. */
  giantOpacity: number;
  /** Extra glow on the giant title while it holds centre (0–1). */
  glow: number;
  /** Lens frame drawing itself, corners out (0 = nothing, 1 = closed box). */
  draw: number;
  /** Frosted glass inside the frame (0 = clear, 1 = fully frosted). */
  frost: number;
  /** First card blurring in: opacity, and 1 − share of blur / zoom left. */
  reveal: number;
  /** Giant title shrinking into the label (0 = giant, 1 = label). It scales
   *  from its left edge and stays behind the lens the whole way. */
  fly: number;
  /** Real section label (kicker + title) opacity; takes over from the giant. */
  heading: number;
  /** Lens fill: 0 = glass, 1 = solid (hides the thumbs sliding under it). */
  solid: number;
  /** "Scroll to continue" hint; gone before the counter takes its spot. */
  hint: number;
  /** Thumb strips unfolding (fed to useCoverflow as its intro). */
  thumbs: number;
  /** Arrows, counter and floor glow. */
  chrome: number;
}

// Phases overlap on purpose so nothing ever stops and restarts: the frost
// starts under the last strokes of the frame, the card starts to blur in as
// the box closes, and the title leaves only once the card is coming through.
export function entranceFrame(p: number): EntranceFrame {
  return {
    giantIn: easeOutCubic(segment(p, 0, 0.22)),
    // Solid white from its first frame: it enters from fully off-screen, so it
    // needs no fade — a half-faded white reads as grey.
    giantOpacity: (p > 0 ? 1 : 0) * (1 - segment(p, 0.88, 0.92)),
    glow: smoothstep(segment(p, 0.18, 0.3)) * (1 - segment(p, 0.48, 0.64)),
    draw: segment(p, 0.28, 0.46),
    frost: smoothstep(segment(p, 0.4, 0.56)),
    reveal: smootherstep(segment(p, 0.44, 0.82)),
    fly: easeInOutCubic(segment(p, 0.54, 0.9)),
    heading: segment(p, 0.88, 0.92),
    solid: segment(p, 0.8, 0.86),
    hint: 1 - segment(p, 0.8, 0.86),
    // A long, staggered window (see thumbReveal) — a short one read as a pop.
    thumbs: segment(p, 0.86, 1),
    chrome: segment(p, 0.9, 1),
  };
}

// half-length each side of the frame has grown from its corners, snapped to
// pixel chunks; both reach exactly half the box at draw = 1, so sides meet
export function frameEdges(
  draw: number,
  width: number,
  height: number,
  chunk = EDGE_CHUNK_PX,
): { across: number; down: number } {
  const grow = (half: number) =>
    draw <= 0
      ? 0
      : Math.min(
          half,
          Math.max(chunk, Math.ceil((half * draw) / chunk) * chunk),
        );
  return { across: grow(width / 2), down: grow(height / 2) };
}

// total pinned scroll for a section with `count` cards (svh)
export function pinLengthSvh(count: number): number {
  return ENTRANCE_PIN_SVH + ITEM_PIN_SVH * Math.max(0, count - 1);
}

// share of the pinned travel the entrance takes; the gallery has the rest
export function entranceShare(count: number): number {
  return ENTRANCE_PIN_SVH / pinLengthSvh(count);
}

// whole-pin progress → entrance progress (0–1) and gallery position (0–count-1)
export function splitPin(
  progress: number,
  count: number,
): { entrance: number; gallery: number } {
  const share = entranceShare(count);
  return {
    entrance: clamp01(progress / share),
    gallery:
      count > 1 ? clamp01((progress - share) / (1 - share)) * (count - 1) : 0,
  };
}

// gallery position → lens focus, holding each card centred for a beat
export function dwellFocus(gallery: number, count: number): number {
  const last = Math.max(0, count - 1);
  if (gallery <= 0) return 0;
  if (gallery >= last) return last;
  const i = Math.floor(gallery);
  const t = clamp01((gallery - i - DWELL) / (1 - 2 * DWELL));
  return i + t * t * (3 - 2 * t);
}

// whole-pin progress at which card k sits centred (what the arrows scroll to)
export function progressForCard(k: number, count: number): number {
  const share = entranceShare(count);
  if (count <= 1) return share;
  return share + ((1 - share) * k) / (count - 1);
}
