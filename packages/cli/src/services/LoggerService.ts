import { EventEmitter } from 'events';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    category?: string;
    args?: any[];
}

export class LoggerService extends EventEmitter {
    private static instance: LoggerService;
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;

    private constructor() {
        super();
    }

    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    public log(level: LogLevel, message: string, ...args: any[]) {
        const entry: LogEntry = {
            id: Math.random().toString(36).substring(7),
            timestamp: new Date().toISOString(),
            level,
            message,
            category: this.extractCategory(message),
            args: args.length > 0 ? args : undefined
        };

        this.logs.push(entry);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }

        this.emit('log', entry);
    }

    public getHistory(): LogEntry[] {
        return [...this.logs];
    }

    public clear() {
        this.logs = [];
        this.emit('clear');
    }

    private extractCategory(message: string): string | undefined {
        const match = message.match(/^\[(.*?)\]/);
        return match ? match[1] : undefined;
    }
}
