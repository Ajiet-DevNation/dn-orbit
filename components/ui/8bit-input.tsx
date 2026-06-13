import * as React from "react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
    font?: "normal" | "retro"
  }

const Input8Bit = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, font, ...props }, ref) => {
    return (
      <div
        className={cn(
          "relative border-y-[6px] border-foreground dark:border-ring !p-0 flex items-center",
          className
        )}
      >
        <Input
          {...props}
          ref={ref}
          className={cn(
            "rounded-none ring-0 !w-full border-none",
            font !== "normal" && "retro"
          )}
        />
        <div
          className="absolute inset-0 border-x-[6px] -mx-[6px] border-foreground dark:border-ring pointer-events-none"
          aria-hidden="true"
        />
      </div>
    )
  }
)
Input8Bit.displayName = "Input8Bit"

export { Input8Bit as Input }
