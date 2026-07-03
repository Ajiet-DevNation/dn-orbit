"use client";

import { useEffect } from "react";

// Escape-to-close + body scroll lock while open — keyboard/a11y parity with a
// real dialog for the site's hand-rolled 8-bit modals. (The global motion
// reset means there's no entrance animation to coordinate with.)
export function useModalBehavior(
  open: boolean,
  onOpenChange: (open: boolean) => void,
) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onOpenChange]);
}
