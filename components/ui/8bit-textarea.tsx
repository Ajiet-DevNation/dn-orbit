import * as React from "react";
import {
  FIELD_FRAME,
  FIELD_FRAME_SIDES,
  FIELD_TEXT,
} from "@/components/ui/8bit-input";
import { cn } from "@/lib/utils";

// Multiline twin of the 8-bit Input: same frame, same type, grows downward.
const Textarea8Bit = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <div className={cn(FIELD_FRAME, "items-stretch", className)}>
    <textarea
      {...props}
      ref={ref}
      className={cn(
        "min-h-[120px] w-full resize-y rounded-none bg-transparent px-3.5 py-3 leading-relaxed outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30",
        FIELD_TEXT,
      )}
    />
    <div className={FIELD_FRAME_SIDES} aria-hidden="true" />
  </div>
));
Textarea8Bit.displayName = "Textarea8Bit";

export { Textarea8Bit as Textarea };
