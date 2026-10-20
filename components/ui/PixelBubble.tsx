import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Pluton's speech bubble, from a PixelLab sprite recoloured to the site purple.
// The body (bubble.png) is a 9-slice border-image — 6px source corners at 3×
// (18px) — so one asset fits any text. The tail is the bubble's own generated
// tail; its first source row (3px) sits on the body's outline and opens it.
// Offsets are from the padding box (inside the 18px border): 18 - 3 + 24 = 39.

type Tail = "bottom-left" | "bottom-right" | "left" | "right";

const TAIL: Record<
  Tail,
  { src: string; w: number; h: number; className: string }
> = {
  "bottom-left": {
    src: "/assets/pluton/bubble-tail-down.png",
    w: 42,
    h: 24,
    className: "-bottom-[39px] left-4",
  },
  "bottom-right": {
    src: "/assets/pluton/bubble-tail-down.png",
    w: 42,
    h: 24,
    className: "-bottom-[39px] right-4 -scale-x-100",
  },
  left: {
    src: "/assets/pluton/bubble-tail-left.png",
    w: 24,
    h: 42,
    className: "-left-[39px] top-1/2 -translate-y-1/2",
  },
  right: {
    src: "/assets/pluton/bubble-tail-left.png",
    w: 24,
    h: 42,
    className: "-right-[39px] top-1/2 -translate-y-1/2 -scale-x-100",
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
        "pixelated relative border-[18px] border-solid font-mono leading-snug text-white [border-image:url(/assets/pluton/bubble.png)_6_fill/18px_stretch]",
        className,
      )}
    >
      <span className="relative block">{children}</span>
      <Image
        src={t.src}
        alt=""
        aria-hidden
        width={t.w}
        height={t.h}
        // Served as-is: the optimizer caches by URL, so a recoloured file kept
        // showing its old colours. A 150-byte sprite gains nothing from it.
        unoptimized
        className={cn("pixelated absolute max-w-none", t.className)}
      />
    </div>
  );
}
