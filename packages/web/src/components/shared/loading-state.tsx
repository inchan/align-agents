import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
    className?: string;
    text?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ className, text = "Loading..." }) => {
    return (
        <div className={cn(
            "flex flex-col items-center justify-center py-12 min-h-[200px] text-muted-foreground animate-in fade-in-50",
            className
        )}>
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/50" />
            <p className="text-sm font-medium">{text}</p>
        </div>
    );
};
