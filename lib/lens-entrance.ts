// Pure choreography for the lens sections' scroll entrance (Projects /
// Members), split out from hooks/useLensEntrance.ts so it can be unit-tested
// without a DOM.
//
// Modelled on oryzo.ai's lens reveal, re-skinned for the 8-bit HUD theme: the
// section pins, a small dashed viewfinder sits in the middle, a giant glowing
// title slides across, the viewfinder opens into the full lens while the card
// inside builds up block by block (the site's pixel dissolve, in place of
// Oryzo's blur focus-pull), the giant title flies up into the section heading,
// and the thumb strips unfold from under the lens.

/** Extra scroll the section stays pinned for while the entrance plays (svh). */
export const ENTRANCE_PIN_SVH = 110;
/** Viewfinder side before it opens, as a share of the lens's shorter side. */
export const VIEWFINDER_SHARE = 0.5;
/** Share of the dissolve already cleared at p = 0, so the small viewfinder
 *  shows a glitchy glimpse of the card instead of an empty box. */
export const DISSOLVE_PREVIEW = 0.28;
/** Blur on the lens content before it is in focus (px). */
export const MAX_BLUR_PX = 10;

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
  /** Giant title slide-in from the right (0 = off to the side, 1 = centred). */
  giantIn: number;
  /** Giant title opacity. */
  giantOpacity: number;
  /** Giant title flight into the heading slot (0 = centre, 1 = heading). */
  fly: number;
  /** Real section heading opacity (takes over from the giant title). */
  heading: number;
  /** "SCROLL" hint under the viewfinder. */
  hint: number;
  /** Crosshair / ticks inside the viewfinder. */
  reticle: number;
  /** Viewfinder → full lens (0 = small square, 1 = full lens). */
  open: number;
  /** Share of the pixel cover cleared (DISSOLVE_PREVIEW → 1). */
  dissolve: number;
  /** Lens content blur, px. */
  blur: number;
  /** Thumb strips unfolding (fed to useCoverflow as its intro). */
  thumbs: number;
  /** Arrows, counter and floor glow. */
  chrome: number;
}

export function entranceFrame(p: number): EntranceFrame {
  const giantIn = easeOutCubic(segment(p, 0, 0.3));
  const fly = easeInOutCubic(segment(p, 0.5, 0.75));
  const dissolve =
    DISSOLVE_PREVIEW + (1 - DISSOLVE_PREVIEW) * segment(p, 0.3, 0.62);
  return {
    giantIn,
    giantOpacity: giantIn * (1 - segment(p, 0.72, 0.78)),
    fly,
    heading: segment(p, 0.7, 0.76),
    hint: 1 - segment(p, 0, 0.15),
    reticle: 1 - segment(p, 0.25, 0.4),
    open: easeInOutCubic(segment(p, 0.25, 0.55)),
    dissolve,
    blur: MAX_BLUR_PX * (1 - segment(p, 0.3, 0.65)),
    thumbs: segment(p, 0.66, 0.9),
    chrome: segment(p, 0.82, 0.95),
  };
}

// when cover cell i clears, in [0, 1): a scattered but deterministic order
export function dissolveAt(i: number): number {
  const r = Math.sin((i + 1) * 12.9898) * 43758.5453;
  return r - Math.floor(r);
}

// viewfinder size for an open amount, morphing the square into the lens
export function viewfinderSize(
  open: number,
  lensWidth: number,
  lensHeight: number,
): { width: number; height: number } {
  const side = Math.min(lensWidth, lensHeight) * VIEWFINDER_SHARE;
  return {
    width: side + (lensWidth - side) * open,
    height: side + (lensHeight - side) * open,
  };
}
