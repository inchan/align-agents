import { LoggerService } from '../services/LoggerService.js';

export class LogInterceptor {
    private static originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };
    private static isLogging = false;

    public static init() {
        const loggerService = LoggerService.getInstance();

        console.log = (...args: any[]) => {
            LogInterceptor.originalConsole.log(...args);
            // 무한 재귀 방지: 이미 로깅 중이면 LoggerService 호출 스킵
            if (!LogInterceptor.isLogging) {
                LogInterceptor.isLogging = true;
                try {
                    loggerService.log('info', args.map(String).join(' '), ...args);
                } finally {
                    LogInterceptor.isLogging = false;
                }
            }
        };

        console.warn = (...args: any[]) => {
            LogInterceptor.originalConsole.warn(...args);
            if (!LogInterceptor.isLogging) {
                LogInterceptor.isLogging = true;
                try {
                    loggerService.log('warn', args.map(String).join(' '), ...args);
                } finally {
                    LogInterceptor.isLogging = false;
                }
            }
        };

        console.error = (...args: any[]) => {
            LogInterceptor.originalConsole.error(...args);
            if (!LogInterceptor.isLogging) {
                LogInterceptor.isLogging = true;
                try {
                    loggerService.log('error', args.map(String).join(' '), ...args);
                } finally {
                    LogInterceptor.isLogging = false;
                }
            }
        };
    }
}
