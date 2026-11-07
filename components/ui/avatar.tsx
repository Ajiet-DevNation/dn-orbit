import * as React from "react";

import { cn } from "@/lib/utils";

const Avatar = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="avatar"
    className={cn(
      "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
      className,
    )}
    {...props}
  />
));
Avatar.displayName = "Avatar";

const AvatarImage = React.forwardRef<
  HTMLImageElement,
  React.ImgHTMLAttributes<HTMLImageElement>
>(({ className, ...props }, ref) => (
  // A plain <img>: avatars render tiny and come pre-sized from GitHub (see
  // githubAvatarAt), so the optimizer adds a hop without saving bytes. Lazy +
  // async by default: a dozen far-below-the-fold leaderboard avatars used to
  // load eagerly and hold up `window.load`. The empty alt is a decorative-image
  // default — callers override alt/loading via {...props}.
  // biome-ignore lint/performance/noImgElement: see above
  <img
    ref={ref}
    data-slot="avatar-image"
    className={cn("aspect-square h-full w-full", className)}
    alt=""
    loading="lazy"
    decoding="async"
    {...props}
  />
));
AvatarImage.displayName = "AvatarImage";

const AvatarFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-slot="avatar-fallback"
    className={cn(
      "flex h-full w-full items-center justify-center rounded-full bg-muted",
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = "AvatarFallback";

export { Avatar, AvatarFallback, AvatarImage };
