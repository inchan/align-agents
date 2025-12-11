import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Pause, Play, Trash2, Search, Filter, Download, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

/**
 * LogEntry - API 응답 타입
 * Note: packages/cli/src/services/LoggerService.ts의 LogEntry와 동기화 필요
 */
export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug' | 'trace' | 'fatal';
    message: string;
    category?: string;
    args?: unknown[];
}

interface LogViewerProps {
    logs: LogEntry[];
    onClear: () => void;
    isPaused: boolean;
    onTogglePause: () => void;
    onExport?: (format: 'json' | 'csv') => void;
}

const LOG_LEVELS = ['all', 'fatal', 'error', 'warn', 'info', 'debug', 'trace'] as const;
type LogLevelFilter = typeof LOG_LEVELS[number];

export function LogViewer({ logs, onClear, isPaused, onTogglePause, onExport }: LogViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [filterText, setFilterText] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<LogLevelFilter>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Auto-scroll
    useEffect(() => {
        if (!isPaused && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, isPaused]);

    // Extract unique categories
    const categories = Array.from(new Set(logs.map(log => log.category).filter(Boolean))) as string[];

    // Filter logs
    const filteredLogs = logs.filter(log => {
        const matchesText = log.message.toLowerCase().includes(filterText.toLowerCase()) ||
            (log.category && log.category.toLowerCase().includes(filterText.toLowerCase()));
        const matchesLevel = selectedLevel === 'all' || log.level === selectedLevel;
        const matchesCategory = selectedCategory === null || log.category === selectedCategory;

        return matchesText && matchesLevel && matchesCategory;
    });

    const getLevelStyle = (level: string) => {
        switch (level) {
            case 'fatal':
                return 'text-red-100 bg-red-900';
            case 'error':
                return 'text-destructive bg-destructive/10';
            case 'warn':
                return 'text-yellow-500 bg-yellow-500/10';
            case 'info':
                return 'text-primary bg-primary/10';
            case 'debug':
                return 'text-blue-400 bg-blue-400/10';
            case 'trace':
                return 'text-gray-400 bg-gray-400/10';
            default:
                return 'text-gray-500 bg-gray-500/10';
        }
    };

    const getMessageStyle = (level: string) => {
        switch (level) {
            case 'fatal':
            case 'error':
                return 'text-red-300';
            case 'warn':
                return 'text-yellow-200';
            case 'debug':
            case 'trace':
                return 'text-gray-400';
            default:
                return '';
        }
    };

    return (
        <div className="flex flex-col h-full border rounded-lg bg-card shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative w-64">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search logs..."
                            value={filterText}
                            onChange={(e) => setFilterText(e.target.value)}
                            className="h-8 pl-8 text-xs"
                        />
                    </div>

                    <div className="flex items-center gap-1 border-l pl-2 ml-2">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground mr-1" />
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-2 text-xs capitalize"
                                >
                                    {selectedLevel}
                                    <ChevronDown className="ml-1 w-3 h-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                                {LOG_LEVELS.map(level => (
                                    <DropdownMenuItem
                                        key={level}
                                        onClick={() => setSelectedLevel(level)}
                                        className={cn(
                                            "text-xs capitalize",
                                            selectedLevel === level && "bg-accent"
                                        )}
                                    >
                                        {level}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {categories.length > 0 && (
                        <div className="flex items-center gap-1 border-l pl-2 ml-2">
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 px-2 text-xs"
                                    >
                                        {selectedCategory || 'All Categories'}
                                        <ChevronDown className="ml-1 w-3 h-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                                    <DropdownMenuItem
                                        onClick={() => setSelectedCategory(null)}
                                        className={cn(
                                            "text-xs",
                                            selectedCategory === null && "bg-accent"
                                        )}
                                    >
                                        All Categories
                                    </DropdownMenuItem>
                                    {categories.map(cat => (
                                        <DropdownMenuItem
                                            key={cat}
                                            onClick={() => setSelectedCategory(cat)}
                                            className={cn(
                                                "text-xs",
                                                selectedCategory === cat && "bg-accent"
                                            )}
                                        >
                                            {cat}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuContent>
                            </DropdownMenu>
                            {selectedCategory && (
                                <Badge
                                    variant="default"
                                    className="cursor-pointer text-[10px] px-1.5 h-5 whitespace-nowrap"
                                    onClick={() => setSelectedCategory(null)}
                                >
                                    {selectedCategory} ×
                                </Badge>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {onExport && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-muted-foreground"
                                    title="Export logs"
                                    disabled={logs.length === 0}
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    <span className="text-xs">Export</span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onExport('json')}>
                                    Export as JSON
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onExport('csv')}>
                                    Export as CSV
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onTogglePause}
                        className={cn("h-8 w-8 p-0", isPaused && "text-yellow-500")}
                        title={isPaused ? "Resume auto-scroll" : "Pause auto-scroll"}
                    >
                        {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        title="Clear logs"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Log List */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-black/95 text-gray-300"
            >
                {filteredLogs.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10 italic">
                        {logs.length === 0 ? 'No logs yet. Perform actions to see logs here.' : 'No logs match your filters'}
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div key={log.id} className="flex gap-2 hover:bg-white/5 p-0.5 rounded px-1">
                            <span className="text-gray-500 shrink-0 select-none w-[140px]">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={cn(
                                "uppercase font-bold w-12 shrink-0 select-none text-center rounded-[2px] text-[10px] leading-4 h-4 mt-0.5",
                                getLevelStyle(log.level)
                            )}>
                                {log.level}
                            </span>
                            {log.category && (
                                <span className="text-cyan-400 font-semibold shrink-0">
                                    [{log.category}]
                                </span>
                            )}
                            <span className={cn(
                                "break-all whitespace-pre-wrap",
                                getMessageStyle(log.level)
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Status Bar */}
            <div className="bg-muted/50 border-t px-3 py-1 text-[10px] text-muted-foreground flex justify-between">
                <span>
                    Total: {logs.length}
                    {filteredLogs.length !== logs.length && ` | Filtered: ${filteredLogs.length}`}
                </span>
                <span className={cn(isPaused && "text-yellow-500")}>
                    {isPaused ? '⏸ Paused' : '● Live'}
                </span>
            </div>
        </div>
    );
}
