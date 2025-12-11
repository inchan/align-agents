import type { LoggerConfig, LogLevel } from './types.js';
import path from 'path';
import os from 'os';

const DEFAULT_LOG_DIR = path.join(os.homedir(), '.align-agents', 'logs');

export const defaultConfig: Required<LoggerConfig> = {
    level: 'info',
    name: 'align-agents',
    console: true,
    pretty: process.env.NODE_ENV !== 'production',
    base: {},
    redact: [],
    file: {
        directory: process.env.ALIGN_AGENTS_LOG_DIR || DEFAULT_LOG_DIR,
        files: {
            error: 'error.log',
            issues: 'issues.log',
            combined: 'combined.log',
        },
        rotation: {
            size: '10M',
            interval: '1d',
            maxFiles: 7,
            compress: true,
        },
    },
};

export function getLogLevel(): LogLevel {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase();
    const validLevels: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace'];

    if (envLevel && validLevels.includes(envLevel as LogLevel)) {
        return envLevel as LogLevel;
    }

    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
}

export function mergeConfig(userConfig: LoggerConfig = {}): Required<LoggerConfig> {
    return {
        level: userConfig.level ?? getLogLevel(),
        name: userConfig.name ?? defaultConfig.name,
        console: userConfig.console ?? defaultConfig.console,
        pretty: userConfig.pretty ?? defaultConfig.pretty,
        base: { ...defaultConfig.base, ...userConfig.base },
        redact: userConfig.redact ?? defaultConfig.redact,
        file: userConfig.file ? {
            directory: userConfig.file.directory ?? defaultConfig.file.directory,
            files: { ...defaultConfig.file.files, ...userConfig.file.files },
            rotation: { ...defaultConfig.file.rotation, ...userConfig.file.rotation },
        } : defaultConfig.file,
    };
}
