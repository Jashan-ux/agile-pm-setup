import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        // Status variants
        planning:
          "border-transparent bg-slate-500/20 text-slate-300 border border-slate-500/30",
        active:
          "border-transparent bg-green-500/20 text-green-400 border border-green-500/30",
        on_hold:
          "border-transparent bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        completed:
          "border-transparent bg-blue-500/20 text-blue-400 border border-blue-500/30",
        archived:
          "border-transparent bg-gray-500/20 text-gray-400 border border-gray-500/30",
        // Priority variants
        low:
          "border-transparent bg-slate-500/20 text-slate-300 border border-slate-500/30",
        medium:
          "border-transparent bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
        high:
          "border-transparent bg-orange-500/20 text-orange-400 border border-orange-500/30",
        critical:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        // Task status
        todo:
          "border-transparent bg-slate-500/20 text-slate-300 border border-slate-500/30",
        in_progress:
          "border-transparent bg-blue-500/20 text-blue-400 border border-blue-500/30",
        in_review:
          "border-transparent bg-purple-500/20 text-purple-400 border border-purple-500/30",
        blocked:
          "border-transparent bg-red-500/20 text-red-400 border border-red-500/30",
        done:
          "border-transparent bg-green-500/20 text-green-400 border border-green-500/30",
        backlog:
          "border-transparent bg-slate-500/20 text-slate-300 border border-slate-500/30",
        ready:
          "border-transparent bg-cyan-500/20 text-cyan-400 border border-cyan-500/30",
        cancelled:
          "border-transparent bg-gray-500/20 text-gray-400 border border-gray-500/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };