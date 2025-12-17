import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { getLogger, type AlignAgentsLogger, type LogLevel, type LogEntry } from '@align-agents/logger';

/**
 * LoggerService - 메모리 기반 로그 버퍼 + Pino 구조화된 로깅
 *
 * 기존 API 호환성을 유지하면서 pino 로거와 통합됩니다.
 * - getHistory(): UI에서 최근 로그 조회용
 * - EventEmitter: SSE 스트리밍용
 * - Pino: 파일/콘솔 구조화된 로깅
 */
export class LoggerService extends EventEmitter {
    private static instance: LoggerService;
    private logs: LogEntry[] = [];
    private readonly MAX_LOGS = 1000;
    private pinoLogger: AlignAgentsLogger;

    private constructor() {
        super();
        this.pinoLogger = getLogger().child({ component: 'LoggerService' });
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
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            level,
            message,
            category: this.extractCategory(message),
            args: args.length > 0 ? args : undefined
        };

        // 메모리 버퍼 (UI용)
        this.logs.push(entry);
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.shift();
        }

        // Pino 구조화된 로깅
        const logData = {
            category: entry.category,
            ...(args.length > 0 ? { args } : {}),
        };

        switch (level) {
            case 'fatal':
                this.pinoLogger.fatal(logData, message);
                break;
            case 'error':
                this.pinoLogger.error(logData, message);
                break;
            case 'warn':
                this.pinoLogger.warn(logData, message);
                break;
            case 'info':
                this.pinoLogger.info(logData, message);
                break;
            case 'debug':
                this.pinoLogger.debug(logData, message);
                break;
            case 'trace':
                this.pinoLogger.trace(logData, message);
                break;
        }

        // SSE 스트리밍용
        this.emit('log', entry);
    }

    // 편의 메서드
    public info(message: string, ...args: any[]) {
        this.log('info', message, ...args);
    }

    public warn(message: string, ...args: any[]) {
        this.log('warn', message, ...args);
    }

    public error(message: string, ...args: any[]) {
        this.log('error', message, ...args);
    }

    public debug(message: string, ...args: any[]) {
        this.log('debug', message, ...args);
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
