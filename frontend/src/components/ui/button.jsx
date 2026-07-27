import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-l from-primary to-slate-800 text-white shadow-md shadow-primary/20 hover:opacity-95 hover:shadow-lg",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline:
          "border border-slate-200 bg-white text-slate-900 shadow-sm hover:border-primary/40 hover:bg-white hover:text-slate-900 dark:border-white/25 dark:bg-white/95 dark:text-slate-900 dark:hover:bg-white",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/90 dark:bg-white/90 dark:text-slate-900",
        ghost:
          "text-slate-800 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-white/15 dark:hover:text-white",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-sm",
        lg: "h-12 rounded-xl px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const Button = React.forwardRef(({ className, variant, size, ...props }, ref) => {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
  );
});
Button.displayName = "Button";

export { Button, buttonVariants };
