import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Activity, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { type StatsSummary } from '@/lib/api';
import { Skeleton } from '@/components/ui/Skeleton';

interface StatsCardsProps {
    stats: StatsSummary | null;
    isLoading: boolean;
}

export function StatsCards({ stats, isLoading }: StatsCardsProps) {
    if (isLoading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                <Skeleton className="h-4 w-[100px]" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[60px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (!stats) return null;

    const successRate = stats.totalSyncs > 0
        ? Math.round((stats.successCount / stats.totalSyncs) * 100)
        : 0;

    const lastSyncTime = stats.lastSync
        ? new Date(stats.lastSync).toLocaleString()
        : 'Never';

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Syncs</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalSyncs}</div>
                    <p className="text-xs text-muted-foreground">
                        Lifetime sync operations
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{successRate}%</div>
                    <p className="text-xs text-muted-foreground">
                        {stats.successCount} successful syncs
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold truncate text-sm" title={lastSyncTime}>
                        {stats.lastSync ? new Date(stats.lastSync).toLocaleDateString() : 'Never'}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                        {stats.lastSync ? new Date(stats.lastSync).toLocaleTimeString() : '-'}
                    </p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Errors</CardTitle>
                    <AlertCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.errorCount}</div>
                    <p className="text-xs text-muted-foreground">
                        Total errors logged
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
