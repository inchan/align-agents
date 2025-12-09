import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { type ActivityLog } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Info, AlertTriangle, XCircle } from 'lucide-react';

interface ActivityFeedProps {
    activities: ActivityLog[];
    isLoading: boolean;
}

export function ActivityFeed({ activities, isLoading }: ActivityFeedProps) {
    if (isLoading) {
        return (
            <Card className="col-span-3">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4">
                                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                                <div className="space-y-2 flex-1">
                                    <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                                    <div className="h-3 w-1/2 bg-muted animate-pulse rounded" />
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }

    const getIcon = (level: string) => {
        switch (level) {
            case 'error': return <XCircle className="h-4 w-4 text-muted-foreground" />;
            case 'warn': return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
            default: return <Info className="h-4 w-4 text-muted-foreground" />;
        }
    };

    return (
        <Card className="col-span-3 h-full flex flex-col">
            <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
                <div className="h-[300px] overflow-y-auto px-6 pb-6">
                    <div className="space-y-4">
                        {activities.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
                        ) : (
                            activities.map((activity, index) => (
                                <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0">
                                    <div className={cn(
                                        "mt-1 p-1.5 rounded-full shrink-0",
                                        activity.level === 'error' ? "bg-muted" :
                                            activity.level === 'warn' ? "bg-muted" : "bg-muted"
                                    )}>
                                        {getIcon(activity.level)}
                                    </div>
                                    <div className="space-y-1 min-w-0">
                                        <p className="text-sm font-medium leading-none truncate">
                                            {activity.message}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(activity.timestamp).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
