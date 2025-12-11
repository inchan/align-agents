import { useEffect, useState, useCallback, useRef } from 'react';
import { LogViewer, type LogEntry } from '../components/LogViewer';
import { cn } from '@/lib/utils';

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 1000;

/**
 * CSV 이스케이프 함수 - RFC 4180 준수
 */
export function escapeCSV(value: string): string {
    if (value.includes('"') || value.includes('\n') || value.includes('\r') || value.includes(',')) {
        return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
}

/**
 * 로그를 JSON 또는 CSV로 내보내기
 */
export function exportLogs(logs: LogEntry[], format: 'json' | 'csv'): { content: string; filename: string; mimeType: string } | null {
    if (logs.length === 0) return null;

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
        content = JSON.stringify(logs, null, 2);
        filename = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        mimeType = 'application/json';
    } else {
        const headers = ['timestamp', 'level', 'category', 'message'];
        const rows = logs.map(log => [
            escapeCSV(log.timestamp),
            escapeCSV(log.level),
            escapeCSV(log.category || ''),
            escapeCSV(log.message),
        ].join(','));
        content = [headers.join(','), ...rows].join('\n');
        filename = `logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.csv`;
        mimeType = 'text/csv';
    }

    return { content, filename, mimeType };
}

export function LogsPage() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
    const [historyError, setHistoryError] = useState<string | null>(null);
    const [parseErrorCount, setParseErrorCount] = useState(0);
    const eventSourceRef = useRef<EventSource | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        // 기존 연결 정리
        if (eventSourceRef.current) {
            eventSourceRef.current.close();
        }

        setConnectionStatus('connecting');

        const eventSource = new EventSource('/api/logs/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
            setConnectionStatus('connected');
            reconnectAttemptsRef.current = 0; // 연결 성공 시 재시도 횟수 초기화
            // 연결 성공 시 진행 중인 재연결 타임아웃 해제
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        eventSource.onmessage = (event) => {
            try {
                const newLog = JSON.parse(event.data);
                setLogs(prev => [...prev, newLog].slice(-1000)); // Keep last 1000 logs
            } catch (e) {
                console.error('Failed to parse log entry:', e);
                setParseErrorCount(prev => prev + 1);
            }
        };

        eventSource.onerror = () => {
            eventSource.close();
            eventSourceRef.current = null;

            if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                // Exponential backoff
                const delay = INITIAL_RECONNECT_DELAY * Math.pow(2, reconnectAttemptsRef.current);
                reconnectAttemptsRef.current++;

                setConnectionStatus('connecting');

                reconnectTimeoutRef.current = setTimeout(() => {
                    connect();
                }, delay);
            } else {
                setConnectionStatus('error');
            }
        };
    }, []);

    useEffect(() => {
        // Initial load
        fetch('/api/logs/history')
            .then(res => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                return res.json();
            })
            .then(data => {
                setLogs(data);
                setHistoryError(null);
            })
            .catch(err => {
                console.error('Failed to fetch log history:', err);
                setHistoryError('Failed to load log history');
            });

        // SSE Connection
        connect();

        return () => {
            if (eventSourceRef.current) {
                eventSourceRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, [connect]);

    const handleRetry = () => {
        // 진행 중인 재연결 타임아웃 해제
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }
        reconnectAttemptsRef.current = 0;
        connect();
    };

    const handleExport = (format: 'json' | 'csv') => {
        const result = exportLogs(logs, format);
        if (!result) return;

        const { content, filename, mimeType } = result;
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex items-center justify-between shrink-0">
                <h1 className="text-lg font-semibold">Logs</h1>
                <div className="flex items-center gap-4">
                    {historyError && (
                        <span className="text-xs text-destructive">
                            {historyError}
                        </span>
                    )}
                    {parseErrorCount > 0 && (
                        <span className="text-xs text-yellow-500">
                            {parseErrorCount} parse error{parseErrorCount > 1 ? 's' : ''}
                        </span>
                    )}
                    {connectionStatus === 'error' && (
                        <button
                            onClick={handleRetry}
                            className="text-xs text-primary hover:underline"
                        >
                            Retry Connection
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-sm">
                        <span className={cn(
                            "w-2 h-2 rounded-full",
                            connectionStatus === 'connected' ? "bg-green-500" :
                                connectionStatus === 'connecting' ? "bg-yellow-500 animate-pulse" :
                                    connectionStatus === 'error' ? "bg-red-500" : "bg-gray-400"
                        )} />
                        <span className="text-muted-foreground capitalize">
                            {connectionStatus === 'error' ? 'Connection Failed' : connectionStatus}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <LogViewer
                    logs={logs}
                    onClear={() => setLogs([])}
                    isPaused={isPaused}
                    onTogglePause={() => setIsPaused(!isPaused)}
                    onExport={handleExport}
                />
            </div>
        </div>
    );
}
