import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Pluton's speech bubble. The frame is a PixelLab sprite (bubble.png) used as a
// 9-slice border-image — 8px source corners drawn at 2× (16px) — so one asset
// fits any text length and stays crisp. The tail is a separate sprite drawn in
// the same colours; its first 4 source rows overlap the bubble's 4-row border
// (8px at 2×) to open a gap in the outline where it joins.

type Tail = "bottom-left" | "bottom-right" | "left" | "right";

const TAIL: Record<
  Tail,
  { src: string; w: number; h: number; className: string }
> = {
  "bottom-left": {
    src: "/assets/pluton/bubble-tail-down.png",
    w: 24,
    h: 18,
    className: "-bottom-[10px] left-3",
  },
  "bottom-right": {
    src: "/assets/pluton/bubble-tail-down.png",
    w: 24,
    h: 18,
    className: "-bottom-[10px] right-3 -scale-x-100",
  },
  left: {
    src: "/assets/pluton/bubble-tail-left.png",
    w: 18,
    h: 24,
    className: "-left-[10px] top-1/2 -translate-y-1/2",
  },
  right: {
    src: "/assets/pluton/bubble-tail-left.png",
    w: 18,
    h: 24,
    className: "-right-[10px] top-1/2 -translate-y-1/2 -scale-x-100",
  },
};

export function PixelBubble({
  tail,
  className,
  children,
}: {
  tail: Tail;
  className?: string;
  children: ReactNode;
}) {
  const t = TAIL[tail];
  return (
    <div
      className={cn(
        "pixelated relative border-[16px] border-solid font-mono leading-snug text-white [border-image:url(/assets/pluton/bubble.png)_8_fill/16px_stretch]",
        className,
      )}
    >
      <span className="relative -m-1 block">{children}</span>
      <Image
        src={t.src}
        alt=""
        aria-hidden
        width={t.w}
        height={t.h}
        className={cn("pixelated absolute max-w-none", t.className)}
      />
    </div>
  );
}
