import * as React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip'
import { cn } from '@/lib/utils'

interface TruncateTooltipProps {
    children: React.ReactNode
    content?: React.ReactNode
    className?: string
    side?: 'top' | 'bottom' | 'left' | 'right'
    contentClassName?: string
}

export function TruncateTooltip({
    children,
    content,
    className,
    side = 'top',
    contentClassName
}: TruncateTooltipProps) {
    const textRef = React.useRef<HTMLDivElement>(null)
    const [isTruncated, setIsTruncated] = React.useState(false)

    React.useEffect(() => {
        const checkTruncation = () => {
            if (textRef.current) {
                setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth)
            }
        }

        checkTruncation()

        // Re-check on window resize
        window.addEventListener('resize', checkTruncation)
        return () => window.removeEventListener('resize', checkTruncation)
    }, [children])

    const textElement = (
        <div ref={textRef} className={cn('truncate', className)}>
            {children}
        </div>
    )

    if (!isTruncated) {
        return textElement
    }

    return (
        <TooltipProvider delayDuration={200}>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div ref={textRef} className={cn('truncate cursor-default', className)}>
                        {children}
                    </div>
                </TooltipTrigger>
                <TooltipContent side={side} className={cn('max-w-md', contentClassName)}>
                    <p className="break-all">{content || children}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    )
}
