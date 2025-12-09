import React from 'react';
import { Badge } from './badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertCircle, HelpCircle, Ban, CircleOff } from 'lucide-react';

export type StatusVariant = 'configured' | 'active' | 'supported' | 'disabled' | 'error' | 'unsupported';

interface StatusBadgeProps {
    status: StatusVariant;
    className?: string;
    showIcon?: boolean;
    customLabel?: string;
}

const statusConfig: Record<StatusVariant, { label: string, variant: "default" | "secondary" | "destructive" | "outline", className: string, icon: React.ElementType }> = {
    configured: {
        label: 'Configured',
        variant: 'default',
        className: 'bg-green-500 hover:bg-green-600 border-transparent',
        icon: CheckCircle2
    },
    active: {
        label: 'Active',
        variant: 'default',
        className: 'bg-blue-500 hover:bg-blue-600 border-transparent',
        icon: CheckCircle2
    },
    supported: {
        label: 'Supported',
        variant: 'secondary',
        className: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50',
        icon: HelpCircle
    },
    disabled: {
        label: 'Disabled',
        variant: 'secondary',
        className: 'text-muted-foreground bg-muted hover:bg-muted/80',
        icon: CircleOff
    },
    error: {
        label: 'Error',
        variant: 'destructive',
        className: '',
        icon: AlertCircle
    },
    unsupported: {
        label: 'Unsupported',
        variant: 'outline',
        className: 'text-muted-foreground border-dashed',
        icon: Ban
    }
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className, showIcon = true, customLabel }) => {
    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <Badge
            variant={config.variant}
            className={cn("gap-1.5 px-2 py-0.5", config.className, className)}
        >
            {showIcon && <Icon className="w-3.5 h-3.5" />}
            <span>{customLabel || config.label}</span>
        </Badge>
    );
};
