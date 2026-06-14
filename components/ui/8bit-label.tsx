import * as React from "react"
import * as LabelPrimitive from "@radix-ui/react-label"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> {
    font?: "normal" | "retro"
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
))
Label8Bit.displayName = "Label8Bit"

export { Label8Bit as Label }
