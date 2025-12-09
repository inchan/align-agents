import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Pause, Play, Trash2, Search, Filter } from 'lucide-react';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    category?: string;
    args?: any[];
}

interface LogViewerProps {
    logs: LogEntry[];
    onClear: () => void;
    isPaused: boolean;
    onTogglePause: () => void;
}

export function LogViewer({ logs, onClear, isPaused, onTogglePause }: LogViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [filterText, setFilterText] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<'all' | 'info' | 'warn' | 'error'>('all');
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
                        {(['all', 'info', 'warn', 'error'] as const).map(level => (
                            <Button
                                key={level}
                                variant={selectedLevel === level ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setSelectedLevel(level)}
                                className={cn(
                                    "h-6 px-2 text-xs capitalize",
                                    selectedLevel === level && level === 'error' && "bg-destructive/10 text-destructive hover:bg-destructive/20",
                                    selectedLevel === level && level === 'warn' && "bg-muted/10 text-muted-foreground hover:bg-muted/20",
                                )}
                            >
                                {level}
                            </Button>
                        ))}
                    </div>

                    {categories.length > 0 && (
                        <div className="flex items-center gap-1 border-l pl-2 ml-2 overflow-x-auto max-w-[300px] no-scrollbar">
                            {categories.map(cat => (
                                <Badge
                                    key={cat}
                                    variant={selectedCategory === cat ? 'default' : 'outline'}
                                    className="cursor-pointer text-[10px] px-1.5 h-5 whitespace-nowrap"
                                    onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                >
                                    {cat}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onTogglePause}
                        className={cn("h-8 w-8 p-0", isPaused && "text-muted-foreground")}
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
                        No logs found
                    </div>
                ) : (
                    filteredLogs.map((log) => (
                        <div key={log.id} className="flex gap-2 hover:bg-white/5 p-0.5 rounded px-1">
                            <span className="text-gray-500 shrink-0 select-none w-[140px]">
                                {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                            <span className={cn(
                                "uppercase font-bold w-12 shrink-0 select-none text-center rounded-[2px] text-[10px] leading-4 h-4 mt-0.5",
                                log.level === 'info' && "text-primary bg-primary/10",
                                log.level === 'warn' && "text-muted-foreground bg-muted",
                                log.level === 'error' && "text-destructive bg-destructive/10",
                            )}>
                                {log.level}
                            </span>
                            {log.category && (
                                <span className="text-secondary-foreground font-semibold shrink-0">
                                    [{log.category}]
                                </span>
                            )}
                            <span className={cn(
                                "break-all whitespace-pre-wrap",
                                log.level === 'error' && "text-destructive-foreground",
                                log.level === 'warn' && "text-muted-foreground",
                            )}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* Status Bar */}
            <div className="bg-muted/50 border-t px-3 py-1 text-[10px] text-muted-foreground flex justify-between">
                <span>Total: {logs.length} | Filtered: {filteredLogs.length}</span>
                <span>{isPaused ? 'Paused' : 'Live'}</span>
            </div>
        </div>
    );
}
