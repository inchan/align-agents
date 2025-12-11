// Core logger
export { createLogger, getLogger, initLogger, createChildLogger, logger, shutdown } from './logger.js';

// Fastify integration
export { createFastifyLogger, fastifyLoggerPlugin } from './fastify.js';
export type { FastifyLoggerOptions } from './fastify.js';

// Express integration
export { createExpressLogger, expressLoggerMiddleware, expressErrorLogger } from './express.js';
export type { ExpressLoggerOptions } from './express.js';

// Types
export type {
    LogLevel,
    LoggerConfig,
    FileLoggerConfig,
    LogContext,
    LogEntry,
    Logger,
    AlignAgentsLogger,
} from './types.js';

// Config utilities
export { defaultConfig, getLogLevel, mergeConfig } from './config.js';
