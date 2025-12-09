import { LoggerService } from '../services/LoggerService.js';

export class LogInterceptor {
    private static originalConsole = {
        log: console.log,
        warn: console.warn,
        error: console.error
    };

    public static init() {
        const logger = LoggerService.getInstance();

        console.log = (...args: any[]) => {
            LogInterceptor.originalConsole.log(...args);
            logger.log('info', args.map(String).join(' '), ...args);
        };

        console.warn = (...args: any[]) => {
            LogInterceptor.originalConsole.warn(...args);
            logger.log('warn', args.map(String).join(' '), ...args);
        };

        console.error = (...args: any[]) => {
            LogInterceptor.originalConsole.error(...args);
            logger.log('error', args.map(String).join(' '), ...args);
        };
    }
}
