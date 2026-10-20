import { cn } from "@/lib/utils";

// Pixel-art glyphs. Press Start 2P has no ▸ ◂ ▾ ▲ ▼ ← → ✓ ✗ ✕, so those fell
// back to a system font (the arrows even rendered as a stray dot). These draw
// the same shapes in crisp squares, sized in em so they track the text around
// them.

const BASE = "inline-block shrink-0 fill-current";

const ROTATE = {
  right: "",
  left: "rotate-180",
  down: "rotate-90",
  up: "-rotate-90",
} as const;

export function PixelArrow({
  dir = "right",
  className,
}: {
  dir?: keyof typeof ROTATE;
  className?: string;
}) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative glyph, aria-hidden keeps it out of the a11y tree
    <svg
      aria-hidden
      viewBox="0 0 4 7"
      shapeRendering="crispEdges"
      className={cn(
        BASE,
        "h-[0.875em] w-[0.5em] align-[-0.05em]",
        ROTATE[dir],
        className,
      )}
    >
      <rect x="0" y="0" width="1" height="7" />
      <rect x="1" y="1" width="1" height="5" />
      <rect x="2" y="2" width="1" height="3" />
      <rect x="3" y="3" width="1" height="1" />
    </svg>
  );
}

export function PixelCheck({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative glyph, aria-hidden keeps it out of the a11y tree
    <svg
      aria-hidden
      viewBox="0 0 8 5"
      shapeRendering="crispEdges"
      className={cn(BASE, "h-[0.625em] w-[1em]", className)}
    >
      <rect x="7" y="0" width="1" height="1" />
      <rect x="6" y="1" width="1" height="1" />
      <rect x="0" y="2" width="1" height="1" />
      <rect x="5" y="2" width="1" height="1" />
      <rect x="1" y="3" width="1" height="1" />
      <rect x="4" y="3" width="1" height="1" />
      <rect x="2" y="4" width="2" height="1" />
    </svg>
  );
}

export function PixelCross({ className }: { className?: string }) {
  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: decorative glyph, aria-hidden keeps it out of the a11y tree
    <svg
      aria-hidden
      viewBox="0 0 5 5"
      shapeRendering="crispEdges"
      className={cn(BASE, "size-[0.75em] align-[-0.02em]", className)}
    >
      <rect x="0" y="0" width="1" height="1" />
      <rect x="4" y="0" width="1" height="1" />
      <rect x="1" y="1" width="1" height="1" />
      <rect x="3" y="1" width="1" height="1" />
      <rect x="2" y="2" width="1" height="1" />
      <rect x="1" y="3" width="1" height="1" />
      <rect x="3" y="3" width="1" height="1" />
      <rect x="0" y="4" width="1" height="1" />
      <rect x="4" y="4" width="1" height="1" />
    </svg>
  );
}
