"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

// Shared FLIP shared-element transition: an originating card element animates
// from its on-screen rect into a detail slot, and back on close.
export function useFlipDetail() {
  const [selected, setSelected] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const fromRectRef = useRef<DOMRect | null>(null);
  const flipRef = useRef<HTMLDivElement>(null);

  const open = useCallback((id: string, el: HTMLElement) => {
    fromRectRef.current = el.getBoundingClientRect();
    setSelected(id);
  }, []);

  useLayoutEffect(() => {
    const el = flipRef.current;
    const from = fromRectRef.current;
    if (selected === null || !el || !from) return;
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = to.width ? from.width / to.width : 1;
    const sy = to.height ? from.height / to.height : 1;
    el.style.transition = "none";
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    void el.offsetWidth;
    requestAnimationFrame(() => {
      el.style.transition = "transform 480ms var(--ease-out-quart)";
      el.style.transform = "translate(0px, 0px) scale(1, 1)";
      setDetailOpen(true);
    });
  }, [selected]);

  const close = useCallback(() => {
    const el = flipRef.current;
    const from = fromRectRef.current;
    setDetailOpen(false);
    if (!el || !from) {
      setSelected(null);
      return;
    }
    const to = el.getBoundingClientRect();
    const dx = from.left - to.left;
    const dy = from.top - to.top;
    const sx = to.width ? from.width / to.width : 1;
    const sy = to.height ? from.height / to.height : 1;
    el.style.transition = "transform 420ms var(--ease-out-quart)";
    el.style.transformOrigin = "top left";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
    const done = () => {
      el.removeEventListener("transitionend", done);
      setSelected(null);
    };
    el.addEventListener("transitionend", done);
  }, []);

  const closeRef = useRef(close);
  useEffect(() => {
    closeRef.current = close;
  });
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  return { selected, detailOpen, flipRef, open, close };
}
