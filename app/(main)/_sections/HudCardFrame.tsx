import { memo } from "react";

// HUD cartridge chrome layered over a coverflow card. Steady-state emphasis
// (depth darken, edge bloom, bracket brightness, scanlines) is driven by the
// engine's per-frame --cf-center / --cf-depth vars via opacity (compositor
// cheap). The bracket "pop" is animated imperatively by GSAP (useCardPowerOn),
// which targets .hud-bracket inside the card; the power-on pixel-scan lives in a
// separate PixelScanOverlay the consumer mounts only on the active card. "full"
// (Projects) adds the steady scanlines texture; "depth" (Members) keeps the
// frame readable over the flipped bio.
export const HudCardFrame = memo(function HudCardFrame({
  variant = "full",
}: {
  variant?: "full" | "depth";
}) {
  // Brackets sit at 25% opacity off-centre and brighten to full at the centre.
  const bracketOpacity = "calc(0.25 + var(--cf-center, 0) * 0.75)";
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
    >
      <div
        className="absolute inset-0 bg-black"
        style={{ opacity: "var(--cf-depth, 0)" }}
      />
      <div
        className="hud-bloom absolute inset-[-1px]"
        style={{ opacity: "var(--cf-center, 0)" }}
      />

      {variant === "full" && (
        <div
          className="hud-scanlines absolute inset-0"
          style={{ opacity: "calc(var(--cf-center, 0) * 0.35)" }}
        />
      )}

      <div className="hud-bracket hud-bracket--tl" style={{ opacity: bracketOpacity }} />
      <div className="hud-bracket hud-bracket--tr" style={{ opacity: bracketOpacity }} />
      <div className="hud-bracket hud-bracket--bl" style={{ opacity: bracketOpacity }} />
      <div className="hud-bracket hud-bracket--br" style={{ opacity: bracketOpacity }} />
    </div>
  );
});
