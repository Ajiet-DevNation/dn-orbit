import type * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
  font?: "normal" | "retro";
}

const Label8Bit = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  LabelProps
>(({ className, font, ...props }, ref) => (
  <Label
    ref={ref}
    className={cn(className, font !== "normal" && "retro")}
    {...props}
  />
));
Label8Bit.displayName = "Label8Bit";

export { Label8Bit as Label };
