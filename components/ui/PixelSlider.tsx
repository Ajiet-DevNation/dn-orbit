"use client";

import { useCallback, useRef } from "react";
import { cn } from "@/lib/utils";

// 8-bit slider: a chunky pixel track with a square green handle. Replaces the
// browser-native range input so it stays on-theme. Fully controllable by
// pointer (click + drag, touch-safe) and keyboard (arrows), with proper
// role="slider" ARIA.
export function PixelSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  "aria-label": ariaLabel,
}: {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  "aria-label"?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const pct = ((value - min) / (max - min)) * 100;

  const setFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const ratio = Math.min(
        1,
        Math.max(0, (clientX - rect.left) / rect.width),
      );
      const raw = min + ratio * (max - min);
      const snapped = Math.round(raw / step) * step;
      onChange(Math.min(max, Math.max(min, snapped)));
    },
    [min, max, step, onChange],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFromClientX(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      setFromClientX(e.clientX);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      onChange(Math.max(min, value - step));
    } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      onChange(Math.min(max, value + step));
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(min);
    } else if (e.key === "End") {
      e.preventDefault();
      onChange(max);
    }
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onKeyDown={onKeyDown}
      className={cn(
        "relative h-3 w-full touch-none select-none border-2 border-white/20 bg-black outline-none focus-visible:border-[#22c55e]",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer",
      )}
    >
      {/* Filled portion */}
      <div
        className="absolute inset-y-0 left-0 bg-[#22c55e]/30"
        style={{ width: `${pct}%` }}
        aria-hidden="true"
      />
      {/* Square pixel handle */}
      <div
        className="pointer-events-none absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 border-2 border-white/80 bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.5)]"
        style={{ left: `${pct}%` }}
        aria-hidden="true"
      />
    </div>
  );
}
