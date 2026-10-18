// Pure geometry for the lens carousel (Projects / Members), split out from
// hooks/useCoverflow.ts so it can be unit-tested without a DOM.
//
// One focus value drives two strips. Inside the centre "lens" a full-size card
// slides one lens-width per step; outside it, small thumbs slide one thumb-pitch
// per step. A thumb reaches the lens edge at |d| = 1, exactly when its big twin
// starts to enter, so items look like they grow passing through the lens.

/** Peak photo tilt (deg) while a card is half way through the lens. */
export const MAX_TILT_DEG = 10;
/** Peak photo zoom added at the lens edge, so the tilt never shows a corner. */
export const MAX_ZOOM = 0.2;
/** Space between two big cards sharing the lens mid-move (px). */
export const LENS_ITEM_GAP = 12;

export interface LensDims {
  /** Inner (clipped) lens width, px. */
  lensWidth: number;
  thumbWidth: number;
  /** Space from lens edge to first thumb, and between thumbs, px. */
  gap: number;
}

function clamp(n: number, lo: number, hi: number): number {
  return n < lo ? lo : n > hi ? hi : n;
}

// big card offset inside the lens; on screen only while |d| < 1
export function lensX(d: number, lensWidth: number): number {
  return d * (lensWidth + LENS_ITEM_GAP);
}

// thumb centre from stage centre; hugs lens edge at |d| = 1, slides under it as d → 0
export function thumbX(d: number, { lensWidth, thumbWidth, gap }: LensDims) {
  if (d === 0) return 0;
  const pitch = thumbWidth + gap;
  const reach =
    lensWidth / 2 + gap + thumbWidth / 2 + (Math.abs(d) - 1) * pitch;
  return Math.sign(d) * reach;
}

// fade thumbs out before the loop seam, where an item jumps to the other side
export function thumbOpacity(d: number, count: number): number {
  return clamp((count / 2 - Math.abs(d)) * 2, 0, 1);
}

// photo tilt + zoom for a card d steps from centre (0 at rest)
export function lensTilt(d: number): { deg: number; scale: number } {
  const t = clamp(d, -1, 1);
  return { deg: t * MAX_TILT_DEG, scale: 1 + Math.abs(t) * MAX_ZOOM };
}

/** Below this viewport width the lens takes phone sizing. */
export const LENS_BREAKPOINT = 768;
/** Desktop lens height as a share of the viewport (oryzo.ai uses ~0.8). */
export const LENS_HEIGHT_SHARE = 0.8;
/** Desktop: room the nav above and the counter below need, px. */
export const LENS_HEIGHT_RESERVE = 180;
/** Phone: the title sits above the lens, so more room is reserved, px. */
export const PHONE_HEIGHT_RESERVE = 300;
/** Smallest lens height before the section is allowed to overflow, px. */
export const MIN_LENS_HEIGHT = 220;

export interface LensSizing {
  maxWidth: number;
  /** Card height / width. */
  ratio: number;
  /** Lens width as a share of the viewport on wider screens. */
  share: number;
  /** Lens width as a share of the viewport on phones. */
  phoneShare: number;
  /** Thumb height / lens height. */
  thumbRatio: number;
}

// lens + thumb sizes that fill one pinned screen like oryzo's, in both directions
export function lensSize(
  viewportWidth: number,
  viewportHeight: number,
  s: LensSizing,
) {
  const phone = viewportWidth < LENS_BREAKPOINT;
  const heightRoom = phone
    ? viewportHeight - PHONE_HEIGHT_RESERVE
    : Math.min(
        viewportHeight * LENS_HEIGHT_SHARE,
        viewportHeight - LENS_HEIGHT_RESERVE,
      );
  const byWidth = Math.min(
    s.maxWidth,
    viewportWidth * (phone ? s.phoneShare : s.share),
  );
  const byHeight = Math.max(MIN_LENS_HEIGHT, heightRoom) / s.ratio;
  const cardW = Math.round(Math.min(byWidth, byHeight));
  const cardH = Math.round(cardW * s.ratio);
  const thumbH = Math.round(cardH * s.thumbRatio);
  const thumbW = Math.round(thumbH / s.ratio);
  return { cardW, cardH, thumbW, thumbH };
}
