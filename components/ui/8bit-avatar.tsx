import { cva } from "class-variance-authority";
import type React from "react";
import { forwardRef, useId } from "react";
import {
  Avatar as ShadcnAvatar,
  AvatarFallback as ShadcnAvatarFallback,
  AvatarImage as ShadcnAvatarImage,
} from "@/components/ui/avatar";

import { cn } from "@/lib/utils";

const avatarVariants = cva("", {
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

  const rawId = useId();
  const clipId = `pixel-clip-${rawId.replace(/:/g, "")}`;

  return (
    <div
      className={cn(
        "relative flex items-center justify-center size-10 shrink-0",
        className,
      )}
    >
      {isPixel && (
        <>
          {/* SVG Clip Path (Perfect 30x30 inner boundary, scaled by 1/30) */}
          <svg
            className="absolute w-0 h-0 pointer-events-none"
            aria-hidden="true"
          >
            <defs>
              <clipPath id={clipId} clipPathUnits="objectBoundingBox">
                <path
                  transform="scale(0.0333333333333333)"
                  d="M 11 1 H 19 V 2 H 21 V 3 H 23 V 4 H 24 V 5 H 25 V 6 H 26 V 7 H 27 V 9 H 28 V 11 H 29 V 19 H 28 V 21 H 27 V 23 H 26 V 24 H 25 V 25 H 24 V 26 H 23 V 27 H 21 V 28 H 19 V 29 H 11 V 28 H 9 V 27 H 7 V 26 H 6 V 25 H 5 V 24 H 4 V 23 H 3 V 21 H 2 V 19 H 1 V 11 H 2 V 9 H 3 V 7 H 4 V 6 H 5 V 5 H 6 V 4 H 7 V 3 H 9 V 2 H 11 Z"
                  shapeRendering="crispEdges"
                />
              </clipPath>
            </defs>
          </svg>

          {/* Outer border ring — Added scale-[1.12] to make it thicker outside */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none text-gray-500 scale-[1.12] origin-center"
            viewBox="0 0 30 30"
            preserveAspectRatio="none"
            style={{ zIndex: 0 }}
            aria-hidden="true"
          >
            <path
              d="M 11 0 H 19 V 1 H 21 V 2 H 23 V 3 H 24 V 4 H 25 V 5 H 26 V 6 H 27 V 7 H 28 V 9 H 29 V 11 H 30 V 19 H 29 V 21 H 28 V 23 H 27 V 24 H 26 V 25 H 25 V 26 H 24 V 27 H 23 V 28 H 21 V 29 H 19 V 30 H 11 V 29 H 9 V 28 H 7 V 27 H 6 V 26 H 5 V 25 H 4 V 24 H 3 V 23 H 2 V 21 H 1 V 19 H 0 V 11 H 1 V 9 H 2 V 7 H 3 V 6 H 4 V 5 H 5 V 4 H 6 V 3 H 7 V 2 H 9 V 1 H 11 Z"
              fill="currentColor"
              shapeRendering="crispEdges"
            />
          </svg>
        </>
      )}

      {/* Actual Avatar Content */}
      <ShadcnAvatar
        ref={ref}
        data-slot="avatar"
        className={cn(
          "relative flex size-full shrink-0 overflow-hidden text-xs bg-background",
          !isPixel && "rounded-none",
          font !== "normal" && "retro",
          variant === "retro" && "image-rendering-pixelated",
        )}
        style={{
          ...(isPixel ? { clipPath: `url(#${clipId})` } : {}),
          zIndex: 1,
        }}
        {...props}
      />

      {/* Square border styling for non-pixel variants */}
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
          className,
        )}
        {...props}
      />
    );
  },
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
      "flex h-full w-full items-center justify-center rounded-none bg-muted text-foreground",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarFallback, AvatarImage };

export default Avatar;
