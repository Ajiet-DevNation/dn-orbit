import type React from "react";
import { forwardRef } from "react";

import {
  Avatar as ShadcnAvatar,
  AvatarFallback as ShadcnAvatarFallback,
  AvatarImage as ShadcnAvatarImage,
} from "@/components/ui/avatar";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";


export const avatarVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
    variant: {
      default: "",
      retro: "",
      pixel: "",
    },
  },
  defaultVariants: {
    font: "retro",
    variant: "pixel",
  },
});

const Avatar = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    font?: "normal" | "retro";
    variant?: "default" | "retro" | "pixel";
  }
>(({ className = "", font, variant = "pixel", ...props }, ref) => {
  const isPixel = variant === "pixel";

  return (
    <div className={cn("relative size-max", className)}>
      {/* Pixel frame (only show if pixel variant) */}
      {isPixel && (
        <div
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ zIndex: 10 }}
        >
          {/* Top section - Row 1 */}
          <div className="absolute top-0 left-[23%] right-[23%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Top section - Row 2 */}
          <div className="absolute top-[6.25%] left-[17%] right-[17%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Top section - Row 3 */}
          <div className="absolute top-[12.5%] left-[11%] h-[7%] bg-foreground dark:bg-ring w-[20%]"></div>
          <div className="absolute top-[12.5%] right-[11%] h-[7%] bg-foreground dark:bg-ring w-[20%]"></div>

          {/* Top section - Row 4 */}
          <div className="absolute top-[18.75%] left-[5%] w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[18.75%] right-[5%] w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Top section - Row 5 */}
          <div className="absolute top-[25%] left-0 w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[25%] right-0 w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Top section - Rows 6-7 */}
          <div className="absolute top-[31.25%] left-0 w-[13.5%] h-[13%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[31.25%] right-0 w-[13.5%] h-[13%] bg-foreground dark:bg-ring"></div>

          {/* Top section - Rows 8-10 */}
          <div className="absolute top-[43.75%] left-0 w-[13.5%] h-[7%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[43.75%] right-0 w-[13.5%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Bottom section - Rows 8-10 (mirror) */}
          <div className="absolute top-[50%] left-0 w-[13.5%] h-[7%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[50%] right-0 w-[13.5%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Bottom section - Rows 6-7 (mirror) */}
          <div className="absolute top-[56.25%] left-0 w-[13.5%] h-[13%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[56.25%] right-0 w-[13.5%] h-[13%] bg-foreground dark:bg-ring"></div>

          {/* Bottom section - Row 5 (mirror) */}
          <div className="absolute top-[68.75%] left-0 w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[68.75%] right-0 w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Bottom section - Row 4 (mirror) */}
          <div className="absolute top-[75%] left-[5%] w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>
          <div className="absolute top-[75%] right-[5%] w-[20%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Bottom section - Row 3 (mirror) */}
          <div className="absolute top-[81.25%] left-[11%] h-[7%] bg-foreground dark:bg-ring w-[20%]"></div>
          <div className="absolute top-[81.25%] right-[11%] h-[7%] bg-foreground dark:bg-ring w-[20%]"></div>

          {/* Bottom section - Row 2 (mirror) */}
          <div className="absolute top-[87.5%] left-[17%] right-[17%] h-[7%] bg-foreground dark:bg-ring"></div>

          {/* Bottom section - Row 1 (mirror) */}
          <div className="absolute bottom-0 left-[23%] right-[23%] h-[7%] bg-foreground dark:bg-ring"></div>
        </div>
      )}

      <ShadcnAvatar
        ref={ref}
        data-slot="avatar"
        className={cn(
          "relative flex size-10 shrink-0 overflow-hidden text-xs",
          !isPixel && "rounded-none",
          isPixel && "rounded-full",
          font !== "normal" && "retro",
          variant === "retro" && "image-rendering-pixelated",
          className
        )}
        {...props}
      />

      {/* Original border styling (only show if not pixel variant) */}
      {!isPixel && (
        <>
          <div className="absolute top-0 left-0 w-full h-1.5 bg-foreground dark:bg-ring pointer-events-none" />
          <div className="absolute bottom-0 w-full h-1.5 bg-foreground dark:bg-ring pointer-events-none" />
          <div className="absolute top-1.5 -left-1.5 w-1.5 h-1/2 bg-foreground dark:bg-ring pointer-events-none" />
          <div className="absolute bottom-1.5 -left-1.5 w-1.5 h-1/2 bg-foreground dark:bg-ring pointer-events-none" />
          <div className="absolute top-1.5 -right-1.5 w-1.5 h-1/2 bg-foreground dark:bg-ring pointer-events-none" />
          <div className="absolute bottom-1.5 -right-1.5 w-1.5 h-1/2 bg-foreground dark:bg-ring pointer-events-none" />
        </>
      )}
    </div>
  );
});
Avatar.displayName = "Avatar";

interface BitAvatarImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  font?: "normal" | "retro";
  variant?: "default" | "retro" | "pixel";
}

const AvatarImage = forwardRef<HTMLImageElement, BitAvatarImageProps>(
  ({ className, font, ...props }, ref) => {
    return (
      <ShadcnAvatarImage
        ref={ref}
        data-slot="avatar-image"
        className={cn(
          "aspect-square h-full w-full",
          font === "retro" && "retro",
          className
        )}
        {...props}
      />
    );
  }
);
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <ShadcnAvatarFallback
    ref={ref}
    data-slot="avatar-fallback"
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted text-foreground",
      className
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarImage, AvatarFallback };

export default Avatar;
