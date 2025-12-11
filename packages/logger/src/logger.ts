import pino, { multistream, type DestinationStream, type StreamEntry } from 'pino';
import type { LoggerConfig, AlignAgentsLogger, LogContext } from './types.js';
import { mergeConfig } from './config.js';
import { createFileTransports, createConsoleTransport, type LeveledStream } from './transports.js';

let rootLogger: AlignAgentsLogger | null = null;

// 기본 민감 정보 마스킹 경로
const DEFAULT_REDACT_PATHS = [
    'req.headers.authorization',
    'req.headers.cookie',
    'body.password',
    'body.token',
    'body.secret',
    'body.apiKey',
    'body.accessToken',
    'body.refreshToken',
];

export function createLogger(config: LoggerConfig = {}): AlignAgentsLogger {
    const mergedConfig = mergeConfig(config);
    const streams: StreamEntry[] = [];

    // File transports (레벨별로 분리)
    if (mergedConfig.file) {
        const fileStreams = createFileTransports(mergedConfig.file);
        for (const { level, stream } of fileStreams) {
            streams.push({ level, stream });
        }
    }

    // 민감 정보 마스킹 설정
    const redactPaths = [
        ...DEFAULT_REDACT_PATHS,
        ...(mergedConfig.redact ?? []),
    ];

    const pinoOptions: pino.LoggerOptions = {
        level: mergedConfig.level,
        name: mergedConfig.name,
        base: {
            pid: process.pid,
            ...mergedConfig.base,
        },
        timestamp: pino.stdTimeFunctions.isoTime,
        // 민감 정보 마스킹
        redact: {
            paths: redactPaths,
            censor: '[REDACTED]',
        },
        // 에러 serializer (프로덕션에서 스택 트레이스 제한)
        serializers: {
            err: pino.stdSerializers.err,
            error: (err: Error) => ({
                type: err.name,
                message: err.message,
                ...(process.env.NODE_ENV !== 'production' && err.stack
                    ? { stack: err.stack }
                    : {}),
            }),
        },
    };

    // Pretty print 모드 (개발 환경)
    if (mergedConfig.pretty && mergedConfig.console) {
        // Pretty 모드에서도 파일 로깅을 지원하기 위해 pino-pretty를 worker로 사용
        if (streams.length > 0) {
            // 파일 스트림이 있는 경우: pino.transport의 targets 사용
            const targets: pino.TransportTargetOptions[] = [
                {
                    target: 'pino-pretty',
                    level: mergedConfig.level,
                    options: {
                        colorize: true,
                        translateTime: 'SYS:standard',
                        ignore: 'pid,hostname',
                    },
                },
            ];

            // 파일 스트림은 별도의 multistream으로 처리
            // pino.transport와 multistream을 함께 사용하는 것은 복잡하므로
            // 파일 로깅은 별도의 child logger 방식으로 처리
            const consoleLogger = pino({
                ...pinoOptions,
                transport: { targets },
            });

            // 파일 스트림에도 로그를 기록하는 wrapper
            const fileMultistream = multistream(streams);

            return new Proxy(consoleLogger, {
                get(target, prop, receiver) {
                    const value = Reflect.get(target, prop, receiver);
                    if (typeof value === 'function' && ['fatal', 'error', 'warn', 'info', 'debug', 'trace'].includes(prop as string)) {
                        return (...args: unknown[]) => {
                            // 콘솔에 출력
                            (value as Function).apply(target, args);
                            // 파일에도 기록 (JSON 형식으로)
                            const logObj = typeof args[0] === 'object' ? args[0] : {};
                            const msg = typeof args[0] === 'string' ? args[0] : (args[1] as string) ?? '';
                            const level = pino.levels.values[prop as string];
                            const logLine = JSON.stringify({
                                level: prop,
                                time: new Date().toISOString(),
                                name: mergedConfig.name,
                                msg,
                                ...logObj,
                            }) + '\n';
                            fileMultistream.write(logLine);
                        };
                    }
                    return value;
                },
            }) as AlignAgentsLogger;
        }

        // 파일 스트림이 없는 경우: 단순 pretty 모드
        pinoOptions.transport = {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'SYS:standard',
                ignore: 'pid,hostname',
            },
        };
        return pino(pinoOptions);
    }

    // Production mode: multistream
    if (mergedConfig.console) {
        streams.push({
            level: mergedConfig.level,
            stream: createConsoleTransport(false),
        });
    }

    if (streams.length > 0) {
        return pino(pinoOptions, multistream(streams));
    }

    return pino(pinoOptions);
}

export function getLogger(): AlignAgentsLogger {
    if (!rootLogger) {
        rootLogger = createLogger();
    }
    return rootLogger;
}

export function initLogger(config: LoggerConfig = {}): AlignAgentsLogger {
    rootLogger = createLogger(config);
    return rootLogger;
}

export function createChildLogger(context: LogContext): AlignAgentsLogger {
    return getLogger().child(context);
}

/**
 * 로거 종료 (버퍼 플러시)
 */
export async function shutdown(): Promise<void> {
    if (rootLogger) {
        // pino의 flush는 동기식이지만 안전하게 처리
        rootLogger.flush();
        rootLogger = null;
    }
}

// 편의 함수들
export const logger = {
    get instance(): AlignAgentsLogger {
        return getLogger();
    },

    fatal(msg: string, context?: LogContext): void {
        getLogger().fatal(context ?? {}, msg);
    },

    error(msg: string, context?: LogContext): void {
        getLogger().error(context ?? {}, msg);
    },

    warn(msg: string, context?: LogContext): void {
        getLogger().warn(context ?? {}, msg);
    },

    info(msg: string, context?: LogContext): void {
        getLogger().info(context ?? {}, msg);
    },

    debug(msg: string, context?: LogContext): void {
        getLogger().debug(context ?? {}, msg);
    },

    trace(msg: string, context?: LogContext): void {
        getLogger().trace(context ?? {}, msg);
    },

    child(context: LogContext): AlignAgentsLogger {
        return createChildLogger(context);
    },

    shutdown,
};
