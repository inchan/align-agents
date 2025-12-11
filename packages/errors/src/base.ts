import { ErrorCode, type ErrorCodeType } from './codes.js';

/**
 * Base error class for all domain errors
 */
export class DomainError extends Error {
    public code: ErrorCodeType;
    public statusCode: number;
    public readonly details?: unknown;
    public readonly timestamp: string;

    constructor(
        message: string,
        code: ErrorCodeType = ErrorCode.INTERNAL_ERROR,
        statusCode: number = 500,
        details?: unknown
    ) {
        super(message);
        this.name = this.constructor.name;
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.timestamp = new Date().toISOString();

        // Maintains proper stack trace for where our error was thrown (only available on V8)
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }

        // Set the prototype explicitly (required for extending built-in classes)
        Object.setPrototypeOf(this, new.target.prototype);
    }

    /**
     * Converts the error to a JSON-serializable object
     */
    toJSON(): Record<string, unknown> {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            statusCode: this.statusCode,
            details: this.details,
            timestamp: this.timestamp,
        };
    }

    /**
     * Converts the error to an API response format
     */
    toApiResponse(): {
        error: {
            code: ErrorCodeType;
            message: string;
            details?: unknown;
        };
    } {
        return {
            error: {
                code: this.code,
                message: this.message,
                ...(this.details !== undefined ? { details: this.details } : {}),
            },
        };
    }

    /**
     * Type guard to check if an error is a DomainError
     */
    static isDomainError(error: unknown): error is DomainError {
        return error instanceof DomainError;
    }

    /**
     * Wraps an unknown error into a DomainError
     */
    static from(error: unknown, defaultMessage = 'An unexpected error occurred'): DomainError {
        if (error instanceof DomainError) {
            return error;
        }

        if (error instanceof Error) {
            return new DomainError(
                error.message || defaultMessage,
                ErrorCode.UNEXPECTED_ERROR,
                500,
                { originalError: error.name, stack: error.stack }
            );
        }

        return new DomainError(
            typeof error === 'string' ? error : defaultMessage,
            ErrorCode.UNEXPECTED_ERROR,
            500,
            { originalError: error }
        );
    }
}
