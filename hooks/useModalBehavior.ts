"use client";

import { type RefObject, useEffect, useId } from "react";
import { isTopModal, modalDepth, popModal, pushModal } from "@/lib/modal-stack";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

function focusableWithin(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    // offsetParent is null for display:none subtrees; the fixed-position check
    // keeps genuinely visible fixed elements from being filtered out.
    (el) =>
      el.offsetParent !== null || getComputedStyle(el).position === "fixed",
  );
}

interface Options {
  /**
   * The modal's container. When provided, focus is trapped inside it and moved
   * there on open. Omit for callers that only want Escape + scroll lock.
   */
  containerRef?: RefObject<HTMLElement | null>;
  /** Set false to keep Escape from closing (e.g. a destructive confirm). */
  closeOnEscape?: boolean;
}

/**
 * Escape-to-close, body scroll lock, and focus management for the site's
 * hand-rolled 8-bit modals — keyboard and a11y parity with a real dialog.
 *
 * Scroll lock and Escape are coordinated through lib/modal-stack so that
 * stacked modals behave: the body unlocks only when the last one closes, and
 * Escape closes only the top-most.
 */
export function useModalBehavior(
  open: boolean,
  onOpenChange: (open: boolean) => void,
  { containerRef, closeOnEscape = true }: Options = {},
) {
  // Stable per-instance identity for the stack.
  const id = useId();

  useEffect(() => {
    if (!open) return;

    pushModal(id);

    // Lock on the way in only if we're the first modal, and remember what the
    // page actually had so a site that sets its own overflow is respected.
    const body = document.body;
    const previousOverflow = modalDepth() === 1 ? body.style.overflow : null;
    if (modalDepth() === 1) body.style.overflow = "hidden";

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const onKey = (e: KeyboardEvent) => {
      // Only the top-most modal reacts, so one Escape doesn't collapse a whole
      // stack of them.
      if (!isTopModal(id)) return;

      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onOpenChange(false);
        return;
      }

      if (e.key !== "Tab" || !containerRef?.current) return;

      const items = focusableWithin(containerRef.current);
      if (items.length === 0) {
        // Nothing tabbable inside — keep focus on the container rather than
        // letting Tab escape to the page behind.
        e.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (
        e.shiftKey &&
        (active === first || !containerRef.current.contains(active))
      ) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKey);

    // Move focus in on the next frame: the container's children may still be
    // mounting on the frame the modal opens.
    const raf = requestAnimationFrame(() => {
      const container = containerRef?.current;
      if (!container) return;
      if (container.contains(document.activeElement)) return;
      const items = focusableWithin(container);
      (items[0] ?? container).focus({ preventScroll: true });
    });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
      popModal(id);

      if (modalDepth() === 0) {
        body.style.overflow = previousOverflow ?? "";
      }

      // Return focus to whatever opened the modal — without this the tab order
      // restarts at the top of the document after closing.
      if (previouslyFocused?.isConnected) {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [open, onOpenChange, id, containerRef, closeOnEscape]);
}
