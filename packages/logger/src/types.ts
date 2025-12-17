import type { Logger as PinoLogger } from 'pino';

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';

export interface LoggerConfig {
    /** 로그 레벨 (기본값: 'info') */
    level?: LogLevel;
    /** 로거 이름 (컴포넌트 구분용) */
    name?: string;
    /** 파일 로깅 설정 */
    file?: FileLoggerConfig;
    /** 콘솔 출력 여부 (기본값: true) */
    console?: boolean;
    /** 개발 모드 (pretty print) */
    pretty?: boolean;
    /** 기본 메타데이터 */
    base?: Record<string, unknown>;
    /** 민감 정보 마스킹 경로 (예: ['req.headers.authorization', 'body.password']) */
    redact?: string[];
}

export interface FileLoggerConfig {
    /** 로그 디렉토리 경로 */
    directory: string;
    /** 파일별 설정 */
    files?: {
        /** 에러 로그 (error 레벨만) */
        error?: string;
        /** 이슈 로그 (warn + error) */
        issues?: string;
        /** 전체 로그 */
        combined?: string;
    };
    /** 로그 로테이션 설정 */
    rotation?: {
        /** 파일 크기 제한 (예: '10M', '100K') */
        size?: string;
        /** 보관 기간 (예: '7d', '30d') */
        interval?: string;
        /** 최대 파일 개수 */
        maxFiles?: number;
        /** 압축 여부 */
        compress?: boolean;
    };
}

export interface LogContext {
    /** 요청 추적 ID */
    requestId?: string;
    /** 사용자 ID */
    userId?: string;
    /** 작업 유형 */
    operation?: string;
    /** 추가 메타데이터 */
    [key: string]: unknown;
}

export interface LogEntry {
    id: string; // 고유 ID
    timestamp: string; // ISO 형식 타임스탬프
    level: LogLevel;
    msg: string;
    name?: string;
    requestId?: string;
    category?: string; // 카테고리 (예: "CLI")
    [key: string]: unknown;
}

// Pino Logger를 그대로 사용
export type Logger = PinoLogger;
export type AlignAgentsLogger = PinoLogger;

export interface SyncLogEntry {
    type: 'rules' | 'mcp';
    toolId: string;
    toolName: string;
    status: 'success' | 'error' | 'skipped' | 'not-supported';
    targetPath?: string;
    message?: string;
    strategy?: string;
}

