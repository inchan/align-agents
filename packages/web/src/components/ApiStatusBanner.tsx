import { useQuery } from '@tanstack/react-query'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './ui/button'

const API_BASE = '/api'

async function checkHealth() {
    const response = await fetch(`${API_BASE}/health`)
    if (!response.ok) {
        throw new Error('Health check failed')
    }
    return response.json()
}

export function ApiStatusBanner() {
    const { isError, isLoading, refetch } = useQuery({
        queryKey: ['health'],
        queryFn: checkHealth,
        refetchInterval: 10000, // Check every 5 seconds
        retry: false, // Don't retry immediately, wait for next interval
        refetchOnWindowFocus: true,
    })

    // Only show banner if there is an error
    if (!isError) return null

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-2 fade-in duration-300">
            <div className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border",
                "bg-destructive/95 text-destructive-foreground border-destructive/50 backdrop-blur-sm"
            )}>
                <AlertCircle className="w-5 h-5" />
                <div className="flex flex-col">
                    <span className="font-semibold text-sm">API Connection Lost</span>
                    <span className="text-xs opacity-90">Cannot connect to the backend server.</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => refetch()}
                    className="ml-2 h-8 w-8 text-destructive-foreground hover:bg-white/20 hover:text-destructive-foreground"
                    disabled={isLoading}
                >
                    <RefreshCw className={cn("w-4 h-4", isLoading && "animate-spin")} />
                </Button>
            </div>
        </div>
    )
}
