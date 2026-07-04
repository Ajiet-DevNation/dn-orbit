import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import {
  Tabs as ShadcnTabs,
  TabsContent as ShadcnTabsContent,
  TabsList as ShadcnTabsList,
  TabsTrigger as ShadcnTabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export const tabsVariants = cva("", {
  variants: {
    variant: {
      default: "bg-primary",
      retro: "retro",
    },
    font: {
      normal: "",
      retro: "retro",
    },
  },
  defaultVariants: {
    font: "retro",
  },
});

export interface BitTabsProps
  extends React.ComponentProps<typeof ShadcnTabs>,
    VariantProps<typeof tabsVariants> {
  asChild?: boolean;
}

function Tabs({ className, ...props }: BitTabsProps) {
  const { font } = props;

  return (
    <ShadcnTabs
      {...props}
      className={cn("relative", font !== "normal" && "retro", className)}
    />
  );
}

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ShadcnTabsList>) {
  return (
    <ShadcnTabsList
      {...props}
      className={cn("relative bg-card rounded-none", className)}
    >
      <div
        className="absolute inset-0 border-t-[6px] border-b-[6px] -my-1.5 border-foreground dark:border-ring pointer-events-none"
        aria-hidden="true"
      />

      <div
        className="absolute inset-0 border-l-[6px] border-r-[6px] -mx-1.5 border-foreground dark:border-ring pointer-events-none"
        aria-hidden="true"
      />
      {children}
    </ShadcnTabsList>
  );
}

function TabsTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ShadcnTabsTrigger>) {
  return (
    <ShadcnTabsTrigger
      className={cn(
        "border-none data-[state=active]:bg-accent data-[state=active]:text-foreground text-muted-foreground rounded-none",
        className,
      )}
      {...props}
    >
      {children}
    </ShadcnTabsTrigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof ShadcnTabsContent>) {
  return <ShadcnTabsContent className={cn("", className)} {...props} />;
}

export { Tabs, TabsContent, TabsList, TabsTrigger };

export default Tabs;
