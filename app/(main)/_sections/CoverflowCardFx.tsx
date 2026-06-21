import { memo } from "react";

// Decorative overlay layers for coverflow cards. Opacity is driven by the
// engine's per-frame --cf-center / --cf-depth vars (compositor-cheap). "full"
// adds the glassy sheen + scanlines (Projects); "depth" keeps only the depth
// darken + centre bloom so it never washes over the Members card's bio text.
export const CoverflowCardFx = memo(function CoverflowCardFx({
  variant = "full",
}: {
  variant?: "full" | "depth";
}) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: "var(--cf-depth, 0)" }}
      />
      {variant === "full" && (
        <>
          <div
            className="cf-sheen absolute inset-0"
            style={{ opacity: "calc(var(--cf-center, 0) * 0.7)" }}
          />
          <div
            className="cf-scanlines absolute inset-0"
            style={{ opacity: "calc(var(--cf-center, 0) * 0.45)" }}
          />
        </>
      )}
      <div
        className="cf-bloom absolute inset-[-1px]"
        style={{ opacity: "var(--cf-center, 0)" }}
      />
    </div>
  );
});
