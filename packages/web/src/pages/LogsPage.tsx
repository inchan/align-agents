import { useEffect, useState } from 'react';
import { LogViewer, type LogEntry } from '../components/LogViewer';
import { cn } from '@/lib/utils';

export function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

    useEffect(() => {
        // Initial load
        fetch('/api/logs/history')
            .then(res => res.json())
            .then(data => {
                setLogs(data);
            })
            .catch(err => console.error('Failed to fetch log history:', err));

        // SSE Connection
        const eventSource = new EventSource('/api/logs/stream');

        eventSource.onopen = () => {
            setConnectionStatus('connected');
        };

        eventSource.onmessage = (event) => {
            try {
                const newLog = JSON.parse(event.data);
                setLogs(prev => [...prev, newLog].slice(-1000)); // Keep last 1000 logs
            } catch (e) {
                console.error('Failed to parse log entry:', e);
            }
        };

        eventSource.onerror = () => {
            setConnectionStatus('disconnected');
            eventSource.close();
            // Retry connection after 5s
            setTimeout(() => {
                setConnectionStatus('connecting');
                // Re-trigger effect by forcing re-mount or state change if needed, 
                // but here we rely on the user refreshing or a more complex reconnection logic.
                // For simplicity, we just show disconnected state.
            }, 5000);
        };

        return () => {
            eventSource.close();
        };
    }, []);

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-end shrink-0">
                <div className="flex items-center gap-2 text-sm">
                    <span className={cn(
                        "w-2 h-2 rounded-full",
                        connectionStatus === 'connected' ? "bg-primary" :
                            connectionStatus === 'connecting' ? "bg-muted-foreground" : "bg-muted-foreground/50"
                    )} />
                    <span className="text-muted-foreground capitalize">{connectionStatus}</span>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <LogViewer
                    logs={logs}
                    onClear={() => setLogs([])}
                    isPaused={isPaused}
                    onTogglePause={() => setIsPaused(!isPaused)}
                />
            </div>
        </div>
    );
}
