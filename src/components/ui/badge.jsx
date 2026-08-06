import * as React from "react"
import { cn } from "@/lib/utils"

const Badge = React.forwardRef(({ className, variant = "default", dot = false, children, ...props }, ref) => {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground shadow-xs",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-red-200 dark:border-red-900/50 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold",
    outline: "border-border text-foreground bg-background/50",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold",
    warning: "border-amber-200 dark:border-amber-900/50 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold",
    info: "border-blue-200 dark:border-blue-900/50 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold",
  }

  const dotColors = {
    default: "bg-primary-foreground",
    secondary: "bg-secondary-foreground",
    destructive: "bg-red-500",
    outline: "bg-muted-foreground",
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    info: "bg-blue-500",
  }
  
  return (
    <div
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 shadow-2xs",
        variants[variant],
        className
      )}
      {...props}
    >
      {(dot || variant === 'success' || variant === 'warning' || variant === 'destructive' || variant === 'info') && (
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", dotColors[variant] || "bg-primary")} />
          <span className={cn("relative inline-flex rounded-full h-2 w-2", dotColors[variant] || "bg-primary")} />
        </span>
      )}
      {children}
    </div>
  )
})
Badge.displayName = "Badge"

export { Badge }
