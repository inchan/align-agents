import type { ErrorCodeType } from '@align-agents/errors';

/**
 * Error info for use case responses
 */
export interface ErrorInfo {
    code: ErrorCodeType;
    message: string;
    details?: unknown;
}
