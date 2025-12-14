import { useQuery } from '@tanstack/react-query'
import { fetchTools, fetchStatsSummary, fetchActivityFeed } from '../lib/api'
import { StatsCards } from '../components/dashboard/StatsCards'
import { ActivityFeed } from '../components/dashboard/ActivityFeed'
import { ToolStatusGrid } from '../components/dashboard/ToolStatusGrid'

export function DashboardPage() {
    const { data: tools, isLoading: toolsLoading } = useQuery({
        queryKey: ['tools'],
        queryFn: fetchTools,
    })

    const { data: stats, isLoading: statsLoading } = useQuery({
        queryKey: ['statsSummary'],
        queryFn: fetchStatsSummary,
    })

    const { data: activities, isLoading: activitiesLoading } = useQuery({
        queryKey: ['activityFeed'],
        queryFn: fetchActivityFeed,
    })

    return (
        <div className="space-y-8">
            {/* Stats Overview */}
            <section>
                <h2 className="text-lg font-semibold tracking-tight mb-4">Overview</h2>
                <StatsCards stats={stats || null} isLoading={statsLoading} />
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tools Status */}
                <section className="lg:col-span-2">
                    <h2 className="text-lg font-semibold tracking-tight mb-4">Tools Status</h2>
                    <ToolStatusGrid tools={tools || []} isLoading={toolsLoading} />
                </section>

                {/* Activity Feed */}
                <section>
                    <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Activity</h2>
                    <ActivityFeed activities={activities || []} isLoading={activitiesLoading} />
                </section>
            </div>
        </div>
    )
}
