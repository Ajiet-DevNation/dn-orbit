import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  font?: "normal" | "retro";
}

const Input8Bit = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, font, ...props }, ref) => {
    return (
      <div
        className={cn(
          // min-w-0 lets the frame shrink below its content's intrinsic width
          // (e.g. native date/number widgets) when it sits in a constrained
          // grid/flex cell, so it clips instead of overflowing the container.
          "relative border-y-[4px] border-foreground dark:border-ring !p-0 flex items-center min-w-0",
          className,
        )}
      >
        <Input
          {...props}
          ref={ref}
          className={cn(
            // focus-visible:ring-0 — the base Input adds a 3px focus ring that
            // pokes outside the pixel frame and overlaps neighbouring fields; the
            // 8-bit frame is the field's own outline, so suppress that ring.
            "rounded-none ring-0 focus-visible:ring-0 focus-visible:border-transparent !w-full min-w-0 border-none",
            font !== "normal" && "retro",
          )}
        />
        <div
          className="absolute inset-0 border-x-[4px] -mx-[4px] border-foreground dark:border-ring pointer-events-none"
          aria-hidden="true"
        />
      </div>
    );
  },
);
Input8Bit.displayName = "Input8Bit";

export { Input8Bit as Input };
