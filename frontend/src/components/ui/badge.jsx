import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition-colors backdrop-blur-sm",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary/90 text-secondary-foreground",
        outline: "border-border/80 bg-white/65 text-foreground",
        low: "border-low/20 bg-low/10 text-low",
        medium: "border-medium/20 bg-medium/10 text-medium",
        high: "border-high/20 bg-high/10 text-high",
        urgent: "border-urgent/20 bg-urgent/10 text-urgent",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
