// Pure choreography for the lens sections' scroll entrance (Projects /
// Members), split out from hooks/useLensEntrance.ts so it can be unit-tested
// without a DOM.
//
// Modelled on oryzo.ai's lens reveal, re-skinned for the 8-bit HUD theme:
//   pin     — the section pins with an EMPTY viewfinder: a dashed, frosted
//             box with a HUD reticle and no picture. A giant glowing title
//             slides across behind it; the box opens into the full lens and
//             the card blurs in (faint and soft → solid and sharp), like
//             oryzo's photo; the title shrinks behind the lens into its label
//             on the left; then the thumb strips unfold from under the lens;
//   gallery — still pinned, scrolling walks the lens through the cards one by
//             one (no loop, like oryzo), each card holding centre for a beat.

/** Pinned scroll the entrance plays over (svh). */
export const ENTRANCE_PIN_SVH = 120;
/** Pinned scroll per gallery step once the lens is formed (svh). */
export const ITEM_PIN_SVH = 60;
/** Share of each gallery step a card holds still at centre, per side. */
const DWELL = 0.2;
/** Viewfinder side before it opens, as a share of the lens height. */
export const VIEWFINDER_SHARE = 0.5;
/** Frosted-glass blur the lens applies to whatever sits behind it. */
export const LENS_FROST = "blur(14px) saturate(130%)";
/** Blur the card starts from as it fades into the opened lens (px). */
export const MAX_BLUR_PX = 18;

function clamp01(n: number): number {
  // `<=` also folds -0 (from -rectTop at exactly 0) into a plain 0.
  return n <= 0 ? 0 : n > 1 ? 1 : n;
}

// local 0→1 progress of p inside [a, b]
export function segment(p: number, a: number, b: number): number {
  return clamp01((p - a) / (b - a));
}

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
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
  /** Giant title slide-in from the right (0 = off to the side, 1 = parked
   *  with its left edge on the label's left edge). */
  giantIn: number;
  /** Giant title opacity. */
  giantOpacity: number;
  /** Extra glow on the giant title while the lens opens (0–1). */
  glow: number;
  /** Giant title shrinking into the label (0 = giant, 1 = label). It scales
   *  from its left edge and stays behind the lens the whole way. */
  fly: number;
  /** Real section title opacity (takes over from the giant title). */
  heading: number;
  /** Crosshair / ticks inside the viewfinder. */
  reticle: number;
  /** Viewfinder → full lens (0 = small square, 1 = full lens). */
  open: number;
  /** Card opacity in the lens: 0 while the viewfinder is an empty box, rising
   *  as the box opens (together with `blur`, a soft blur-in). While it is
   *  below 1 the frosted glass shows the title behind it, blurred — the same
   *  look in every phase the title is under the lens. */
  veil: number;
  /** Card blur in the lens, px: strong as it starts to appear, 0 once sharp. */
  blur: number;
  /** Lens fill: 0 = frosted glass (blurs what is behind), 1 = solid (hides the
   *  thumbs that slide under it once the gallery starts). */
  solid: number;
  /** Thumb strips unfolding (fed to useCoverflow as its intro). */
  thumbs: number;
  /** Arrows, counter and floor glow. */
  chrome: number;
}

// Timed against oryzo.ai's own reveal, frame by frame: an empty viewfinder →
// title slides in behind it → glows as the box opens into a frosted lens → the
// picture blurs in and sharpens → the title shrinks into its label behind the
// lens → only then do the thumb strips arrive.
export function entranceFrame(p: number): EntranceFrame {
  const open = easeInOutCubic(segment(p, 0.3, 0.58));
  return {
    giantIn: easeOutCubic(segment(p, 0.02, 0.32)),
    // Solid white from its first frame: it enters from fully off-screen (see
    // useLensScroll), so it needs no fade — a half-faded white reads as grey.
    giantOpacity: (p > 0 ? 1 : 0) * (1 - segment(p, 0.86, 0.9)),
    glow: segment(p, 0.28, 0.42) * (1 - segment(p, 0.6, 0.76)),
    fly: easeInOutCubic(segment(p, 0.6, 0.88)),
    heading: segment(p, 0.85, 0.89),
    reticle: 1 - segment(p, 0.3, 0.42),
    open,
    veil: easeOutCubic(segment(p, 0.48, 0.72)),
    blur: MAX_BLUR_PX * (1 - easeOutCubic(segment(p, 0.48, 0.8))),
    solid: segment(p, 0.8, 0.86),
    thumbs: segment(p, 0.88, 0.98),
    chrome: segment(p, 0.92, 1),
  };
}

// viewfinder size for an open amount, morphing the square into the lens
export function viewfinderSize(
  open: number,
  lensWidth: number,
  lensHeight: number,
): { width: number; height: number } {
  const side = viewfinderSide(lensWidth, lensHeight);
  return {
    width: side + (lensWidth - side) * open,
    height: side + (lensHeight - side) * open,
  };
}

// starting square side: half the lens height, never wider than the lens
export function viewfinderSide(lensWidth: number, lensHeight: number) {
  return Math.min(lensWidth, lensHeight * VIEWFINDER_SHARE);
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

// "SCROLL TO CONTINUE" stays up through the pin, like oryzo's, then fades
export function hintOpacity(progress: number): number {
  return 1 - segment(progress, 0.94, 1);
}
