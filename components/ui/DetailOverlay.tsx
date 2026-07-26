"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { OverlayCloseButton } from "@/components/ui/OverlayCloseButton";
import { Z_MODAL } from "@/components/ui/PixelModal";
import { useModalBehavior } from "@/hooks/useModalBehavior";

// Full-bleed detail overlay — the third dialog pattern on the site, distinct
// from PixelModal on purpose: a card flies into it via a FLIP shared-element
// transition (see useFlipDetail), so it wants a solid backdrop with no
// entrance animation of its own competing with the flight.
//
// It was duplicated verbatim between ProjectsSection and EventsSection. Beyond
// the duplication both copies scrolled the overlay itself with `overflow-y-auto`
// and never locked the body, so the page behind kept scrolling under it.
// Routing through useModalBehavior fixes that and gives the overlay the same
// Escape / focus-restore semantics as every other dialog.

interface DetailOverlayProps {
  open: boolean;
  onClose: () => void;
  /** Accessible name for the close control, e.g. "Close project details". */
  closeLabel: string;
  children: ReactNode;
}

export function DetailOverlay({
  open,
  onClose,
  closeLabel,
  children,
}: DetailOverlayProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // No focus trap here: the overlay owns the whole viewport and the FLIP card
  // inside it is the visual anchor, so trapping would fight the entrance.
  // Escape + scroll lock + focus restore are what matter.
  useModalBehavior(open, (next) => {
    if (!next) onClose();
  });

  if (!open) return null;

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: backdrop dismissal;
    // Escape is wired through useModalBehavior and the close button is always
    // visible, so this is a convenience, not the only way out.
    <div
      ref={panelRef}
      className="fixed inset-0 overflow-y-auto bg-[#0a0a0a]"
      style={{ zIndex: Z_MODAL.base - 40 }}
      onMouseDown={(e) => {
        // mousedown on the backdrop itself — a drag that started on the card
        // and ended out here must not close.
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col items-center justify-center gap-8 px-6 py-24 lg:flex-row lg:gap-16">
        <OverlayCloseButton
          onClick={onClose}
          label={closeLabel}
          className="fixed right-4 top-4 z-10"
        />
        {children}
      </div>
    </div>
  );
}

/**
 * Wrapper for content inside a DetailOverlay that should NOT dismiss it when
 * clicked. Both sections previously spelled this out as an inline
 * `onClick={(e) => e.stopPropagation()}` on every child.
 */
export function DetailOverlayContent({
  children,
  className,
  style,
  ref,
}: {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: purely stops the
    // backdrop's dismiss handler; adds no behaviour of its own.
    <div
      ref={ref}
      className={className}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
