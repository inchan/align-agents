import * as React from "react"
import { cn } from "@/lib/utils"

interface SwitchProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
    onCheckedChange?: (checked: boolean) => void
}

const Switch = React.forwardRef<HTMLInputElement, SwitchProps>(
    ({ className, checked, onCheckedChange, ...props }, ref) => {
        return (
            <label className={cn("relative inline-flex items-center cursor-pointer", props.disabled && "cursor-not-allowed opacity-50")}>
                <input
                    type="checkbox"
                    className="peer sr-only"
                    ref={ref}
                    checked={checked}
                    onChange={(e) => onCheckedChange?.(e.target.checked)}
                    {...props}
                />
                <div className={cn(
                    "h-5 w-9 rounded-full bg-input transition-colors peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-checked:bg-primary",
                    className
                )} />
                <div className={cn(
                    "absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-background shadow-sm transition-transform peer-checked:translate-x-4"
                )} />
            </label>
        )
    }
)
Switch.displayName = "Switch"

export { Switch }
