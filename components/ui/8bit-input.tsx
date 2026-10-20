import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// One pixel frame for every form control (input, select, textarea): 4px bars
// top/bottom on the wrapper and left/right on an overlay pushed 4px out, which
// leaves the corners notched. The frame is grey at rest, purple while the
// control has focus, red when it is marked aria-invalid.
export const FIELD_FRAME =
  "group/field relative flex min-w-0 items-center border-y-[4px] border-ring transition-colors duration-150 focus-within:border-brand has-[[aria-invalid=true]]:border-[#ef4444]";
export const FIELD_FRAME_SIDES =
  "pointer-events-none absolute inset-0 -mx-1 border-x-[4px] border-ring transition-colors duration-150 group-focus-within/field:border-brand group-has-[[aria-invalid=true]]/field:border-[#ef4444]";
// Typed text: readable mono everywhere; 16px on phones so iOS doesn't zoom.
export const FIELD_TEXT =
  "font-mono text-base text-foreground placeholder:text-muted-foreground md:text-sm";

// Inline error under a control.
export const FIELD_ERROR = "font-mono text-xs leading-relaxed text-[#f87171]";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  font?: "normal" | "retro";
}

const Input8Bit = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, font, ...props }, ref) => {
    return (
      <div className={cn(FIELD_FRAME, "!p-0", className)}>
        <Input
          {...props}
          ref={ref}
          className={cn(
            // The frame is the field's outline, so the base Input's border and
            // 3px focus ring are switched off; focus shows on the frame.
            "h-11 !w-full min-w-0 rounded-none border-none px-3.5 shadow-none ring-0 focus-visible:ring-0",
            FIELD_TEXT,
            font === "retro" && "retro",
          )}
        />
        <div className={FIELD_FRAME_SIDES} aria-hidden="true" />
      </div>
    );
  },
);
Input8Bit.displayName = "Input8Bit";

export { Input8Bit as Input };
