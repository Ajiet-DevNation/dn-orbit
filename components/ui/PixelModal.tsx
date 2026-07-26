"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { Button } from "@/components/ui/8bit-button";
import { useModalBehavior } from "@/hooks/useModalBehavior";
import { cn } from "@/lib/utils";

// ─── The one modal shell ─────────────────────────────────────────────────────
//
// Before this, every dialog on the site was a hand-rolled `fixed inset-0` div.
// There were five of them, copy-pasted and drifted: backdrops at black/70,
// /75, /80 and /85; z-indexes picked ad hoc per file (100, 120, 200); close
// buttons that were each a differently-styled raw <button>X</button>; two of
// seven carrying role/aria-modal; one (the image cropper) with no Escape
// handling or scroll lock at all; and none with an entrance animation, so the
// profile modal snapped open while its own confirm drawer slid in.
//
// Everything below is the single source of truth for that chrome.

/**
 * Z-index scale. Named so nesting is expressed in code rather than by picking a
 * bigger number per call site.
 *
 *   BASE    — ordinary modals (profile, project, event, contact)
 *   NESTED  — something opened from inside a BASE modal (photo popup, cropper)
 *   CONFIRM — destructive confirms, always on top of everything
 */
export const Z_MODAL = {
  base: 100,
  nested: 120,
  confirm: 200,
} as const;

export type ModalLayer = keyof typeof Z_MODAL;

// ─── Stepped power-on animation ──────────────────────────────────────────────
//
// A CRT switching on: a thin scanline snaps to full width, then the panel opens
// vertically in discrete jumps. Quantising progress to a small number of steps
// is what makes it read as 8-bit rather than as a smooth scale.
//
// Driven imperatively by rAF rather than by CSS, for the same reason the rest of
// the site's signature motion is: globals.css flattens every CSS animation and
// transition under `prefers-reduced-motion`. Here we WANT that flattening, so
// the reduced-motion path is handled explicitly (jump straight to the end)
// instead of being silently broken by the global reset.

const ENTER_MS = 260;
const EXIT_MS = 160;
const STEPS = 6;

function quantize(p: number): number {
  return Math.min(1, Math.ceil(p * STEPS) / STEPS);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

interface PixelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Rendered in the header bar; also labels the dialog for screen readers. */
  title?: ReactNode;
  /** Optional line under the title. */
  description?: ReactNode;
  children: ReactNode;
  /** Pinned action row along the bottom, inside the frame. */
  footer?: ReactNode;
  /** Stacking tier — see Z_MODAL. */
  layer?: ModalLayer;
  /** Tailwind max-width for the panel. */
  size?: "sm" | "md" | "lg" | "xl";
  /** Clicking the backdrop closes by default. */
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  /** Hide the header close button (e.g. a confirm with explicit actions). */
  hideClose?: boolean;
  className?: string;
  /** Accent the frame — used by confirms to read as destructive. */
  tone?: "default" | "danger" | "accent";
}

const SIZE_CLASS = {
  sm: "max-w-md",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-5xl",
} as const;

const TONE = {
  default: { border: "border-white/80", bar: "bg-white/[0.06]" },
  danger: { border: "border-red-500/80", bar: "bg-red-500/[0.08]" },
  accent: { border: "border-[#22c55e]/80", bar: "bg-[#22c55e]/[0.08]" },
} as const;

export function PixelModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  layer = "base",
  size = "lg",
  closeOnBackdrop = true,
  closeOnEscape = true,
  hideClose = false,
  className,
  tone = "default",
}: PixelModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const titleId = useId();
  const descId = useId();

  // `open` is the caller's intent; `mounted` keeps the panel in the DOM long
  // enough to play the exit animation.
  const [mounted, setMounted] = useState(open);

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  const paint = useCallback((p: number) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    const stepped = quantize(p);
    if (backdrop) backdrop.style.opacity = String(p);
    if (panel) {
      // scaleY does the opening; the tiny scaleX keeps the "snap to width"
      // beat readable at the very start.
      panel.style.transform = `scaleY(${0.04 + 0.96 * stepped}) scaleX(${0.9 + 0.1 * Math.min(1, p * 3)})`;
      panel.style.opacity = String(Math.min(1, p * 2));
    }
  }, []);

  // Enter / exit tween.
  useEffect(() => {
    if (!mounted) return;

    if (prefersReducedMotion()) {
      paint(open ? 1 : 0);
      if (!open) setMounted(false);
      return;
    }

    const duration = open ? ENTER_MS : EXIT_MS;
    const from = open ? 0 : 1;
    const to = open ? 1 : 0;
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic in, linear out — closing should feel immediate.
      const eased = open ? 1 - (1 - t) ** 3 : t;
      paint(from + (to - from) * eased);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
        return;
      }
      rafRef.current = null;
      if (!open) setMounted(false);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [open, mounted, paint]);

  useModalBehavior(open, onOpenChange, {
    containerRef: panelRef,
    closeOnEscape,
  });

  if (!mounted) return null;

  const z = Z_MODAL[layer];
  const toneStyle = TONE[tone];

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 flex items-center justify-center bg-black/80 p-4"
      style={{ zIndex: z, opacity: 0 }}
      onMouseDown={(e) => {
        // mousedown (not click) on the backdrop itself: a click that STARTED
        // inside the panel and drifted out — selecting text, dragging a slider —
        // must not close the modal.
        if (closeOnBackdrop && e.target === e.currentTarget)
          onOpenChange(false);
      }}
    >
      {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: the dialog
          panel stops backdrop clicks; it is not itself an interactive control. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-describedby={description ? descId : undefined}
        tabIndex={-1}
        className={cn(
          "retro dark relative flex max-h-[90vh] w-full flex-col border-4 bg-[#0a0a0a] outline-none",
          toneStyle.border,
          SIZE_CLASS[size],
          className,
        )}
        style={{ opacity: 0, transformOrigin: "center" }}
      >
        <PixelCorners />

        {(title || !hideClose) && (
          <div
            className={cn(
              "flex shrink-0 items-center justify-between gap-4 border-b-4 px-5 py-3 md:px-7 md:py-4",
              toneStyle.border,
              toneStyle.bar,
            )}
          >
            <div className="min-w-0">
              {title && (
                <h2
                  id={titleId}
                  className="retro truncate text-sm tracking-wider text-white md:text-base"
                >
                  {title}
                </h2>
              )}
              {description && (
                <p
                  id={descId}
                  className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground"
                >
                  {description}
                </p>
              )}
            </div>

            {!hideClose && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onOpenChange(false)}
                aria-label="Close"
                className="shrink-0 text-[10px]"
              >
                <span aria-hidden>✕</span>
              </Button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-7 md:py-6">
          {children}
        </div>

        {footer && (
          <div
            className={cn(
              "flex shrink-0 flex-col gap-3 border-t-4 px-5 py-4 sm:flex-row sm:items-center md:px-7",
              toneStyle.border,
              toneStyle.bar,
            )}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Four pixel blocks at the panel's corners — the same targeting-reticle motif
 * the coverflow cards use, so modals read as part of the same HUD.
 */
function PixelCorners() {
  const common = "pointer-events-none absolute size-2 bg-white/80";
  return (
    <div aria-hidden>
      <span className={cn(common, "-left-1 -top-1")} />
      <span className={cn(common, "-right-1 -top-1")} />
      <span className={cn(common, "-bottom-1 -left-1")} />
      <span className={cn(common, "-bottom-1 -right-1")} />
    </div>
  );
}
