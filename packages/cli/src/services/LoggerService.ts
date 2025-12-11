import { EventEmitter } from 'events';

/** 로그 레벨 타입 */
export type LogLevel = 'info' | 'warn' | 'error';

/** 로그 항목 인터페이스 */
export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    message: string;
    category?: string;
    args?: any[];
}

/**
 * 인메모리 로그 관리 서비스 (싱글톤)
 * 최대 1000개의 로그를 메모리에 보관하며, 'log' 이벤트를 발행한다.
 */
export class LoggerService extends EventEmitter {
    private static instance: LoggerService;
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;

    private constructor() {
        super();
    }

    /**
     * LoggerService 싱글톤 인스턴스를 반환한다.
     * @returns LoggerService 인스턴스
     */
    public static getInstance(): LoggerService {
        if (!LoggerService.instance) {
            LoggerService.instance = new LoggerService();
        }
        return LoggerService.instance;
    }

    /**
     * 로그를 기록하고 'log' 이벤트를 발행한다.
     * @param level - 로그 레벨
     * @param message - 로그 메시지 (예: "[Category] message")
     * @param args - 추가 인자
     */
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

    /**
     * 저장된 모든 로그 항목을 반환한다.
     * @returns LogEntry 배열의 복사본
     */
    public getHistory(): LogEntry[] {
        return [...this.logs];
    }

    /**
     * 모든 로그를 삭제하고 'clear' 이벤트를 발행한다.
     */
    public clear() {
        this.logs = [];
        this.emit('clear');
    }

    /**
     * 메시지에서 카테고리를 추출한다. (예: "[CLI] message" → "CLI")
     */
    private extractCategory(message: string): string | undefined {
        const match = message.match(/^\[(.*?)\]/);
        return match ? match[1] : undefined;
    }
}
