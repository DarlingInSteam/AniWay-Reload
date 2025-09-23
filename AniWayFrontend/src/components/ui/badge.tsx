import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 select-none",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        pinned: "border-amber-500/40 bg-amber-500/15 text-amber-300",
        locked: "border-red-500/40 bg-red-500/15 text-red-300",
        edited: "border-indigo-500/40 bg-indigo-500/15 text-indigo-300",
        new: "border-emerald-500/40 bg-emerald-500/15 text-emerald-300",
        updated: "border-sky-500/40 bg-sky-500/15 text-sky-300",
      },
      size: {
        sm: "px-2.5 py-0.5 text-xs",
        xs: "px-1.5 py-0.5 text-[10px]",
      }
    },
    defaultVariants: {
      variant: "default",
      size: 'sm'
    },
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
