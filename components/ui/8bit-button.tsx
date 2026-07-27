"use client";

import { Slot, Slottable } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 text-sm font-medium whitespace-nowrap transition-[color,background-color,border-color,transform] outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 rounded-none active:translate-y-1 relative border-none",
  {
    variants: {
      variant: {
        default: "bg-foreground text-background",
        destructive: "bg-foreground text-background",
        outline: "bg-foreground text-background",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3",
        lg: "h-10 px-6",
        icon: "size-9 mx-1 my-0",
      },
      font: {
        normal: "",
        retro: "retro",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
      font: "retro",
    },
  },
);

export interface BitButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  ref?: React.Ref<HTMLButtonElement>;
  /**
   * Render the passed child as the root (e.g. a `<Link>`/`<a>`) instead of a
   * `<button>`, so navigational links can wear the pixel chrome. The pixel
   * border/shadow decorations are slotted in as siblings via `Slottable`.
   */
  asChild?: boolean;
}

function Button({
  children,
  className,
  variant = "default",
  size = "default",
  font,
  asChild = false,
  ...props
}: BitButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size, font }),
        font !== "normal" && "retro",
        className,
      )}
      {...props}
    >
      <Slottable>{children}</Slottable>

      {variant !== "ghost" && variant !== "link" && size !== "icon" && (
        <>
          {/* Pixelated border */}
          <div className="absolute -top-1.5 w-1/2 left-1.5 h-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute -top-1.5 w-1/2 right-1.5 h-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute -bottom-1.5 w-1/2 left-1.5 h-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute -bottom-1.5 w-1/2 right-1.5 h-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute top-0 left-0 size-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute top-0 right-0 size-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute bottom-0 left-0 size-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute bottom-0 right-0 size-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute top-1.5 -left-1.5 h-[calc(100%-12px)] w-1.5 bg-foreground dark:bg-ring" />
          <div className="absolute top-1.5 -right-1.5 h-[calc(100%-12px)] w-1.5 bg-foreground dark:bg-ring" />
          {variant !== "outline" && (
            <>
              {/* Top shadow */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-foreground/20" />
              <div className="absolute top-1.5 left-0 w-3 h-1.5 bg-foreground/20" />

              {/* Bottom shadow */}
              <div className="absolute bottom-0 left-0 w-full h-1.5 bg-foreground/20" />
              <div className="absolute bottom-1.5 right-0 w-3 h-1.5 bg-foreground/20" />
            </>
          )}
        </>
      )}
    </Comp>
  );
}

export { Button };

export default Button;
