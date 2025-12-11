import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { createLogger } from './logger.js';
import type { LoggerConfig, AlignAgentsLogger } from './types.js';

export interface FastifyLoggerOptions extends LoggerConfig {
    /** 요청 ID 헤더 이름 (기본값: 'x-request-id') */
    requestIdHeader?: string;
    /** 요청 로깅 제외 경로 */
    ignorePaths?: string[];
    /** 요청 로깅 시 본문 포함 여부 */
    logBody?: boolean;
    /** 응답 로깅 시 본문 포함 여부 */
    logResponseBody?: boolean;
}

export function createFastifyLogger(options: FastifyLoggerOptions = {}): AlignAgentsLogger {
    return createLogger({
        ...options,
        name: options.name ?? 'fastify',
    });
}

export function fastifyLoggerPlugin(
    fastify: FastifyInstance,
    options: FastifyLoggerOptions = {}
): void {
    const logger = createFastifyLogger(options);
    const requestIdHeader = options.requestIdHeader ?? 'x-request-id';
    const ignorePaths = options.ignorePaths ?? ['/health', '/healthz', '/ready'];

    // 요청 ID 생성 및 로깅
    fastify.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
        const requestId = (request.headers[requestIdHeader] as string) ?? randomUUID();

        // 요청에 ID 추가
        (request as any).requestId = requestId;
        reply.header(requestIdHeader, requestId);

        // 무시할 경로 체크
        if (ignorePaths.includes(request.url)) {
            return;
        }

        const childLogger = logger.child({
            requestId,
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
        });

        (request as any).log = childLogger;

        childLogger.info({
            type: 'request',
            query: request.query,
            params: request.params,
            ...(options.logBody && request.body ? { body: request.body } : {}),
        }, 'Incoming request');
    });

    // 응답 로깅
    fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
        if (ignorePaths.includes(request.url)) {
            return;
        }

        const responseTime = reply.elapsedTime;
        const childLogger = (request as any).log as AlignAgentsLogger;

        if (childLogger) {
            const logData = {
                type: 'response',
                statusCode: reply.statusCode,
                responseTime: Math.round(responseTime * 100) / 100,
            };

            if (reply.statusCode >= 500) {
                childLogger.error(logData, 'Request failed');
            } else if (reply.statusCode >= 400) {
                childLogger.warn(logData, 'Request client error');
            } else {
                childLogger.info(logData, 'Request completed');
            }
        }
    });

    // 에러 로깅
    fastify.addHook('onError', async (request: FastifyRequest, _reply: FastifyReply, error: Error) => {
        const childLogger = (request as any).log as AlignAgentsLogger;

        if (childLogger) {
            childLogger.error({
                type: 'error',
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
            }, 'Request error');
        }
    });

    // Fastify에 로거 인스턴스 등록
    fastify.decorate('alignLogger', logger);
}
