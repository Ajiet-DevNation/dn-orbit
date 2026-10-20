import { cn } from "@/lib/utils";

// Pixel-art arrowhead. Press Start 2P has no ▸ ◂ ▾ glyphs, so those fell back
// to a system font and rendered as a stray dot; this draws the same 4×7 shape
// in crisp squares, sized in em so it tracks the label's font size.
const ROTATE = { right: "", left: "rotate-180", down: "rotate-90" } as const;

export function PixelArrow({
  dir = "right",
  className,
}: {
  dir?: keyof typeof ROTATE;
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 4 7"
      shapeRendering="crispEdges"
      className={cn(
        "inline-block h-[0.875em] w-[0.5em] shrink-0 fill-current align-[-0.05em]",
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
