import type { Request, Response, NextFunction, RequestHandler, ErrorRequestHandler } from 'express';
import { randomUUID } from 'crypto';
import { createLogger, getLogger } from './logger.js';
import type { LoggerConfig, AlignAgentsLogger } from './types.js';

export interface ExpressLoggerOptions extends LoggerConfig {
    /** 요청 ID 헤더 이름 (기본값: 'x-request-id') */
    requestIdHeader?: string;
    /** 요청 로깅 제외 경로 */
    ignorePaths?: string[];
    /** 요청 로깅 시 본문 포함 여부 */
    logBody?: boolean;
    /** 루트 로거 공유 여부 (initLogger로 초기화된 로거 사용) */
    useRootLogger?: boolean;
}

// Express Request 타입 확장
declare global {
    namespace Express {
        interface Request {
            requestId?: string;
            log?: AlignAgentsLogger;
        }
    }
}

export function createExpressLogger(options: ExpressLoggerOptions = {}): AlignAgentsLogger {
    // useRootLogger가 true이면 루트 로거의 child 사용
    if (options.useRootLogger) {
        return getLogger().child({ name: options.name ?? 'express' });
    }
    // 그렇지 않으면 새 로거 생성
    return createLogger({
        ...options,
        name: options.name ?? 'express',
    });
}

export function expressLoggerMiddleware(options: ExpressLoggerOptions = {}): RequestHandler {
    const logger = createExpressLogger(options);
    const requestIdHeader = options.requestIdHeader ?? 'x-request-id';
    const ignorePaths = options.ignorePaths ?? ['/health', '/healthz', '/ready', '/api/health'];

    return (req: Request, res: Response, next: NextFunction): void => {
        const startTime = Date.now();
        const requestId = (req.headers[requestIdHeader] as string) ?? randomUUID();

        // 요청에 ID 추가
        req.requestId = requestId;
        res.setHeader(requestIdHeader, requestId);

        // 무시할 경로 체크
        if (ignorePaths.some(p => req.path === p || req.path.startsWith(p))) {
            next();
            return;
        }

        const childLogger = logger.child({
            requestId,
            method: req.method,
            url: req.originalUrl || req.url,
            userAgent: req.headers['user-agent'],
        });

        req.log = childLogger;

        childLogger.info({
            type: 'request',
            query: req.query,
            params: req.params,
            ...(options.logBody && req.body ? { body: req.body } : {}),
        }, 'Incoming request');

        // 응답 완료 시 로깅
        res.on('finish', () => {
            const responseTime = Date.now() - startTime;

            const logData = {
                type: 'response',
                statusCode: res.statusCode,
                responseTime,
            };

            if (res.statusCode >= 500) {
                childLogger.error(logData, 'Request failed');
            } else if (res.statusCode >= 400) {
                childLogger.warn(logData, 'Request client error');
            } else {
                childLogger.info(logData, 'Request completed');
            }
        });

        next();
    };
}

export function expressErrorLogger(options: ExpressLoggerOptions = {}): ErrorRequestHandler {
    const logger = createExpressLogger(options);

    return (err: Error, req: Request, res: Response, next: NextFunction): void => {
        const childLogger = req.log ?? logger;

        childLogger.error({
            type: 'error',
            error: {
                name: err.name,
                message: err.message,
                stack: err.stack,
            },
            requestId: req.requestId,
        }, 'Unhandled error');

        next(err);
    };
}
