import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "text-foreground border-border bg-transparent hover:bg-accent",
        ghost: "border-transparent bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground",
        // Card rarity variants
        common: "border-transparent bg-muted text-muted-foreground",
        uncommon: "border-transparent bg-zinc-400/20 text-zinc-600 dark:bg-zinc-500/20 dark:text-zinc-400",
        rare: "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
        mythic: "border-transparent bg-orange-500/15 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
        // MTG color identity badges
        white: "border-transparent bg-amber-100 text-amber-900 dark:bg-amber-200/20 dark:text-amber-200",
        blue: "border-transparent bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
        black: "border-transparent bg-zinc-800/90 text-zinc-100 dark:bg-zinc-700 dark:text-zinc-200",
        red: "border-transparent bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400",
        green: "border-transparent bg-green-500/15 text-green-700 dark:bg-green-500/20 dark:text-green-400",
        // Status badges
        success: "border-transparent bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
        warning: "border-transparent bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
        info: "border-transparent bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
      },
      size: {
        default: "px-2 py-0.5 text-xs",
        sm: "px-1.5 py-0 text-[10px]",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
