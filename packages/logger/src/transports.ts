import fs from 'fs';
import { createStream as createRotatingStream, type Options as RfsOptions } from 'rotating-file-stream';
import type { DestinationStream } from 'pino';
import type { FileLoggerConfig, LogLevel } from './types.js';

export const LEVEL_VALUES: Record<LogLevel, number> = {
    fatal: 60,
    error: 50,
    warn: 40,
    info: 30,
    debug: 20,
    trace: 10,
};

export interface LeveledStream {
    level: LogLevel;
    stream: DestinationStream;
}

function ensureDirectory(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * 파일 transport를 생성합니다.
 * JSON 파싱 없이 pino multistream의 레벨 필터링을 활용합니다.
 */
export function createFileTransports(config: FileLoggerConfig): LeveledStream[] {
    const { directory, files, rotation } = config;
    const streams: LeveledStream[] = [];

    ensureDirectory(directory);

    const rotationOptions: RfsOptions = {
        path: directory,
        size: rotation?.size as RfsOptions['size'],
        interval: rotation?.interval as RfsOptions['interval'],
        maxFiles: rotation?.maxFiles ?? 7,
        compress: rotation?.compress ? 'gzip' : false,
    };

    // Error only log (error, fatal) - pino가 레벨 필터링 수행
    if (files?.error) {
        const errorStream = createRotatingStream(files.error, rotationOptions);
        streams.push({
            level: 'error',
            stream: errorStream as unknown as DestinationStream,
        });
    }

    // Issues log (warn + error + fatal) - pino가 레벨 필터링 수행
    if (files?.issues) {
        const issuesStream = createRotatingStream(files.issues, rotationOptions);
        streams.push({
            level: 'warn',
            stream: issuesStream as unknown as DestinationStream,
        });
    }

    // Combined log (all levels)
    if (files?.combined) {
        const combinedStream = createRotatingStream(files.combined, rotationOptions);
        streams.push({
            level: 'trace',
            stream: combinedStream as unknown as DestinationStream,
        });
    }

    return streams;
}

export function createConsoleTransport(pretty: boolean): DestinationStream {
    if (pretty) {
        return {
            write(chunk: string): void {
                process.stdout.write(chunk);
            },
        };
    }

    return process.stdout as unknown as DestinationStream;
}
