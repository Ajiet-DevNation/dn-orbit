import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

// Purple pixel card frame: thin outline with a ring ornament on each corner
// (ring cut from a PixelLab frame, see public/assets/pluton/frame.png). Used as
// a 9-slice border-image — 9px source corners at 3× (27px) — so it fits any
// card size and stays crisp.
export function PixelFrame({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "pixelated border-[27px] border-solid [border-image:url(/assets/pluton/frame.png)_9_fill/27px_stretch]",
        className,
      )}
    >
      {children}
    </div>
  );
}
