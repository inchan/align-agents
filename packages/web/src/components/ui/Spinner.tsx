import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
    size?: number
    className?: string
}

export function Spinner({ size = 24, className, ...props }: SpinnerProps) {
    return (
        <div className={cn("flex justify-center items-center", className)} {...props}>
            <Loader2 className="animate-spin" size={size} />
        </div>
    )
}
