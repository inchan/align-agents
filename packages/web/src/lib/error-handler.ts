import { toast } from 'sonner';

/**
 * Error codes matching the backend @align-agents/errors package
 */
export const ErrorCode = {
    // Validation errors (400)
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    SCHEMA_VALIDATION_ERROR: 'SCHEMA_VALIDATION_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',

    // Not found errors (404)
    NOT_FOUND: 'NOT_FOUND',
    TOOL_NOT_FOUND: 'TOOL_NOT_FOUND',
    CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',

    // Conflict errors (409)
    CONFLICT: 'CONFLICT',
    DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

    // File system errors (500)
    FILE_SYSTEM_ERROR: 'FILE_SYSTEM_ERROR',
    FILE_READ_ERROR: 'FILE_READ_ERROR',
    FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
    PERMISSION_DENIED: 'PERMISSION_DENIED',

    // Database errors (500)
    DATABASE_ERROR: 'DATABASE_ERROR',
    QUERY_ERROR: 'QUERY_ERROR',

    // Sync errors (500)
    SYNC_ERROR: 'SYNC_ERROR',
    PARTIAL_SYNC_ERROR: 'PARTIAL_SYNC_ERROR',
    MCP_SYNC_ERROR: 'MCP_SYNC_ERROR',
    RULES_SYNC_ERROR: 'RULES_SYNC_ERROR',

    // Internal errors (500)
    INTERNAL_ERROR: 'INTERNAL_ERROR',
    UNEXPECTED_ERROR: 'UNEXPECTED_ERROR',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * API error response format from the backend
 */
export interface ApiErrorResponse {
    error: {
        code: ErrorCodeType;
        message: string;
        details?: unknown;
    };
}

/**
 * Parsed API error with additional context
 */
export interface ParsedApiError {
    code: ErrorCodeType;
    message: string;
    details?: unknown;
    statusCode: number;
    isValidationError: boolean;
    isSyncError: boolean;
    isNotFoundError: boolean;
}

/**
 * Checks if a response contains an API error
 */
function isApiErrorResponse(data: unknown): data is ApiErrorResponse {
    return (
        typeof data === 'object' &&
        data !== null &&
        'error' in data &&
        typeof (data as ApiErrorResponse).error === 'object' &&
        (data as ApiErrorResponse).error !== null &&
        'code' in (data as ApiErrorResponse).error &&
        'message' in (data as ApiErrorResponse).error
    );
}

/**
 * Parse an API error response
 */
export async function parseApiError(response: Response): Promise<ParsedApiError> {
    let data: unknown;

    try {
        data = await response.json();
    } catch {
        return {
            code: ErrorCode.UNEXPECTED_ERROR,
            message: '응답을 파싱할 수 없습니다',
            statusCode: response.status,
            isValidationError: false,
            isSyncError: false,
            isNotFoundError: false,
        };
    }

    if (isApiErrorResponse(data)) {
        const { code, message, details } = data.error;

        const VALIDATION_CODES = [
            ErrorCode.VALIDATION_ERROR,
            ErrorCode.SCHEMA_VALIDATION_ERROR,
            ErrorCode.INVALID_INPUT,
        ] as const;

        const SYNC_CODES = [
            ErrorCode.SYNC_ERROR,
            ErrorCode.PARTIAL_SYNC_ERROR,
            ErrorCode.MCP_SYNC_ERROR,
            ErrorCode.RULES_SYNC_ERROR,
        ] as const;

        const NOT_FOUND_CODES = [
            ErrorCode.NOT_FOUND,
            ErrorCode.TOOL_NOT_FOUND,
            ErrorCode.CONFIG_NOT_FOUND,
        ] as const;

        return {
            code,
            message,
            details,
            statusCode: response.status,
            isValidationError: (VALIDATION_CODES as readonly string[]).includes(code),
            isSyncError: (SYNC_CODES as readonly string[]).includes(code),
            isNotFoundError: (NOT_FOUND_CODES as readonly string[]).includes(code),
        };
    }

    // Legacy error format or unknown format
    const legacyMessage =
        (data as { error?: string })?.error ||
        (data as { message?: string })?.message ||
        '알 수 없는 오류가 발생했습니다';

    return {
        code: ErrorCode.UNEXPECTED_ERROR,
        message: legacyMessage,
        statusCode: response.status,
        isValidationError: response.status === 400,
        isSyncError: false,
        isNotFoundError: response.status === 404,
    };
}

/**
 * Korean error messages by error code
 */
const ERROR_MESSAGES: Partial<Record<ErrorCodeType, string>> = {
    [ErrorCode.VALIDATION_ERROR]: '입력값이 올바르지 않습니다',
    [ErrorCode.SCHEMA_VALIDATION_ERROR]: '스키마 검증에 실패했습니다',
    [ErrorCode.NOT_FOUND]: '요청한 리소스를 찾을 수 없습니다',
    [ErrorCode.TOOL_NOT_FOUND]: '도구를 찾을 수 없습니다',
    [ErrorCode.CONFIG_NOT_FOUND]: '설정 파일을 찾을 수 없습니다',
    [ErrorCode.CONFLICT]: '리소스 충돌이 발생했습니다',
    [ErrorCode.DUPLICATE_ENTRY]: '이미 존재하는 항목입니다',
    [ErrorCode.FILE_SYSTEM_ERROR]: '파일 시스템 오류가 발생했습니다',
    [ErrorCode.FILE_READ_ERROR]: '파일을 읽을 수 없습니다',
    [ErrorCode.FILE_WRITE_ERROR]: '파일을 저장할 수 없습니다',
    [ErrorCode.PERMISSION_DENIED]: '권한이 없습니다',
    [ErrorCode.DATABASE_ERROR]: '데이터베이스 오류가 발생했습니다',
    [ErrorCode.SYNC_ERROR]: '동기화에 실패했습니다',
    [ErrorCode.PARTIAL_SYNC_ERROR]: '일부 동기화에 실패했습니다',
    [ErrorCode.MCP_SYNC_ERROR]: 'MCP 동기화에 실패했습니다',
    [ErrorCode.RULES_SYNC_ERROR]: 'Rules 동기화에 실패했습니다',
    [ErrorCode.INTERNAL_ERROR]: '서버 오류가 발생했습니다',
};

/**
 * Get localized error message
 */
export function getLocalizedErrorMessage(error: ParsedApiError): string {
    return ERROR_MESSAGES[error.code] || error.message;
}

/**
 * Handle API error with toast notification
 */
export function handleApiError(error: ParsedApiError, context?: string): void {
    const message = getLocalizedErrorMessage(error);
    const prefix = context ? `${context}: ` : '';

    if (error.isValidationError) {
        toast.error(`${prefix}입력 오류`, {
            description: message,
        });

        // Log validation details for debugging
        if (error.details && Array.isArray(error.details)) {
            console.warn('Validation errors:', error.details);
        }
        return;
    }

    if (error.isSyncError) {
        toast.error(`${prefix}동기화 실패`, {
            description: message,
        });

        // Show failed tools if available
        if (error.details && typeof error.details === 'object' && 'failedTools' in error.details) {
            const failedTools = (error.details as { failedTools: string[] }).failedTools;
            if (failedTools?.length > 0) {
                console.warn('Failed tools:', failedTools);
            }
        }
        return;
    }

    if (error.isNotFoundError) {
        toast.error(`${prefix}찾을 수 없음`, {
            description: message,
        });
        return;
    }

    // Default error handling
    toast.error(prefix ? `${prefix}오류` : '오류', {
        description: message,
    });
}

/**
 * Wrapper for fetch that handles errors consistently
 */
export async function fetchWithErrorHandling<T>(
    url: string,
    options?: RequestInit,
    context?: string
): Promise<T> {
    const response = await fetch(url, options);

    if (!response.ok) {
        const error = await parseApiError(response);
        handleApiError(error, context);
        throw error;
    }

    return response.json();
}
