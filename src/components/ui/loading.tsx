import * as React from "react"
import { Loader2 } from "lucide-react"

import { cn } from "../../lib/utils"

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2
      role="status"
      aria-label="Loading"
      className={cn("size-4 animate-spin", className)}
      {...props}
    />
  )
}

const LoadingButton = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    loading?: boolean
    children: React.ReactNode
  }
>(({ className, loading, children, disabled, ...props }, ref) => (
  <button
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2",
      className
    )}
    disabled={loading || disabled}
    {...props}
  >
    {loading && <Loader2 className="h-4 w-4 animate-spin" />}
    {children}
  </button>
))
LoadingButton.displayName = "LoadingButton"

// Alias untuk backward compatibility
const LoadingSpinner = Spinner

export { Spinner, LoadingButton, LoadingSpinner }