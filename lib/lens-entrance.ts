// Pure choreography for the lens sections' scroll entrance (Projects /
// Members), split out from hooks/useLensEntrance.ts so it can be unit-tested
// without a DOM.
//
// Modelled on oryzo.ai's lens reveal, re-skinned for the 8-bit HUD theme:
//   arrival — while the section scrolls up into view, the content inside the
//             small dashed viewfinder builds up block by block (the site's
//             pixel dissolve), so it is never an empty box;
//   pin     — the section pins; a giant glowing title slides across, the
//             viewfinder opens into the full lens with a brief focus pull,
//             the title shrinks into its label on the left, and the thumb
//             strips unfold from under the lens.

/** Extra scroll the section stays pinned for while the entrance plays (svh). */
export const ENTRANCE_PIN_SVH = 120;
/** Viewfinder side before it opens, as a share of the lens height. */
export const VIEWFINDER_SHARE = 0.5;
/** Peak defocus while the viewfinder opens (px). */
export const MAX_BLUR_PX = 6;

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

// arrival progress: 0 with the section's top at the viewport bottom, 1 as it pins
export function arrivalProgress(rectTop: number, viewportHeight: number) {
  if (viewportHeight <= 0) return 1;
  return clamp01(1 - rectTop / viewportHeight);
}

export interface EntranceFrame {
  /** Giant title slide-in from the right (0 = off to the side, 1 = centred). */
  giantIn: number;
  /** Giant title opacity. */
  giantOpacity: number;
  /** Giant title flight into the label slot (0 = centre, 1 = label). */
  fly: number;
  /** Real section title opacity (takes over from the giant title). */
  heading: number;
  /** "SCROLL TO CONTINUE" hint. */
  hint: number;
  /** Crosshair / ticks inside the viewfinder. */
  reticle: number;
  /** Viewfinder → full lens (0 = small square, 1 = full lens). */
  open: number;
  /** Share of the pixel cover cleared. */
  dissolve: number;
  /** Lens content blur, px. */
  blur: number;
  /** Thumb strips unfolding (fed to useCoverflow as its intro). */
  thumbs: number;
  /** Arrows, counter and floor glow. */
  chrome: number;
}

export function entranceFrame(p: number, arrival = 1): EntranceFrame {
  const giantIn = easeOutCubic(segment(p, 0.04, 0.34));
  const open = easeInOutCubic(segment(p, 0.3, 0.6));
  return {
    giantIn,
    // Full strength almost at once: a half-faded white reads as muddy grey.
    giantOpacity: segment(p, 0.04, 0.12) * (1 - segment(p, 0.8, 0.86)),
    fly: easeInOutCubic(segment(p, 0.56, 0.84)),
    heading: segment(p, 0.8, 0.86),
    hint: 1 - segment(p, 0.06, 0.18),
    reticle: 1 - segment(p, 0.3, 0.42),
    open,
    dissolve: segment(arrival, 0.3, 0.95),
    // A camera-style focus pull: soft mid-open, sharp at both ends.
    blur: MAX_BLUR_PX * Math.sin(Math.PI * open),
    thumbs: segment(p, 0.72, 0.94),
    chrome: segment(p, 0.86, 0.97),
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
