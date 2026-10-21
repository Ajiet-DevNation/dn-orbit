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
  /** Card height / width on portrait phones; defaults to `ratio`. A portrait
   *  screen leaves a landscape card floating in empty space, so a section can
   *  opt in to a taller card there. */
  phoneRatio?: number;
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
  const portrait = phone && viewportHeight > viewportWidth;
  const ratio = portrait ? (s.phoneRatio ?? s.ratio) : s.ratio;
  const byHeight = Math.max(MIN_LENS_HEIGHT, heightRoom) / ratio;
  const cardW = Math.round(Math.min(byWidth, byHeight));
  const cardH = Math.round(cardW * ratio);
  // Thumbs keep the card's own aspect (s.ratio), whatever the phone lens does.
  const thumbH = Math.round(cardH * s.thumbRatio);
  const thumbW = Math.round(thumbH / s.ratio);
  return { cardW, cardH, thumbW, thumbH };
}

/** Thumbs slide in from this far out (px) as they fade in. */
export const THUMB_REVEAL_SHIFT = 56;
/** Each thumb further from the lens starts this much later (share of intro). */
const THUMB_REVEAL_STAGGER = 0.14;

// entrance reveal for a thumb |d| steps from the lens: nearest first, each one
// fading in while easing the last few px into place (no pop, no unfold)
export function thumbReveal(
  intro: number,
  distance: number,
): { opacity: number; shift: number } {
  // Capped at 3 so even far (off-screen) thumbs land as the intro completes.
  const rank = Math.min(3, Math.max(0, Math.ceil(distance) - 1));
  const span = 1 - THUMB_REVEAL_STAGGER * 3;
  const local = clamp((intro - THUMB_REVEAL_STAGGER * rank) / span, 0, 1);
  const eased = 1 - (1 - local) ** 3;
  return { opacity: eased, shift: (1 - eased) * THUMB_REVEAL_SHIFT };
}
