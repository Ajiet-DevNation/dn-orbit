import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const cardVariants = cva("", {
  variants: {
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

export interface BitCardProps
  extends React.ComponentProps<"div">,
    VariantProps<typeof cardVariants> {
  asChild?: boolean;
}

function Card({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn(
        "relative bg-card text-card-foreground border-t-[6px] border-b-[6px] border-foreground dark:border-ring p-0!",
        className,
      )}
    >
      <div
        {...props}
        className={cn(
          "rounded-none border-0 w-full! h-full flex flex-col gap-6 py-6 bg-card text-card-foreground shadow-none",
          font !== "normal" && "retro",
          className,
        )}
      />

      <div
        className={cn(
          "absolute inset-0 border-l-[6px] border-r-[6px] -mx-1.5 border-inherit pointer-events-none",
        )}
        aria-hidden="true"
      />
    </div>
  );
}

function CardHeader({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-6",
        font !== "normal" && "retro",
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn(
        "font-semibold leading-none",
        font !== "normal" && "retro",
        className,
      )}
      {...props}
    />
  );
}

function CardDescription({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn(
        "text-muted-foreground text-sm",
        font !== "normal" && "retro",
        className,
      )}
      {...props}
    />
  );
}

function CardAction({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        font !== "normal" && "retro",
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, font, ...props }: BitCardProps) {
  return (
    <div
      className={cn("px-6 flex-1", font !== "normal" && "retro", className)}
      {...props}
    />
  );
}

function CardFooter({ className, font, ...props }: BitCardProps) {
  return (
    <div
      data-slot="card-footer"
      className={cn(
        "flex items-center px-6",
        font !== "normal" && "retro",
        className,
      )}
      {...props}
    />
  );
}

export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
