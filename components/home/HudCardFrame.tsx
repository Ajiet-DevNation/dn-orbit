import { memo } from "react";

// HUD cartridge chrome layered over a lens card. Emphasis (edge bloom,
// bracket brightness, scanlines) follows the engine's --cf-center var via
// opacity (compositor cheap). The bracket "pop" is animated imperatively by GSAP (useCardPowerOn),
// which targets .hud-bracket inside the card. "full" (Projects) adds the steady
// scanlines texture; "depth" (Members) keeps the frame readable over the
// flipped bio.
export const HudCardFrame = memo(function HudCardFrame({
  variant = "full",
}: {
  variant?: "full" | "depth";
}) {
  // Brackets sit at 25% opacity off-centre and brighten to full at the centre.
  const bracketOpacity = "calc(0.25 + var(--cf-center, 0) * 0.75)";
  return (
    // --cf-center is written on the card by useCoverflow, flipped once per
    // pass; every overlay eases the flip with a CSS opacity transition, which
    // the browser runs on the compositor.
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      <div
        className="hud-bloom absolute inset-[-1px] transition-opacity duration-300 ease-out"
        style={{ opacity: "var(--cf-center, 0)" }}
      />

      {variant === "full" && (
        <div
          className="hud-scanlines absolute inset-0 transition-opacity duration-300 ease-out"
          style={{ opacity: "calc(var(--cf-center, 0) * 0.35)" }}
        />
      )}

      <div
        className="transition-opacity duration-300 ease-out hud-bracket hud-bracket--tl"
        style={{ opacity: bracketOpacity }}
      />
      <div
        className="transition-opacity duration-300 ease-out hud-bracket hud-bracket--tr"
        style={{ opacity: bracketOpacity }}
      />
      <div
        className="transition-opacity duration-300 ease-out hud-bracket hud-bracket--bl"
        style={{ opacity: bracketOpacity }}
      />
      <div
        className="transition-opacity duration-300 ease-out hud-bracket hud-bracket--br"
        style={{ opacity: bracketOpacity }}
      />
    </div>
  );
});
