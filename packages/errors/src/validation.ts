import { DomainError } from './base.js';
import { ErrorCode } from './codes.js';

export interface ValidationErrorDetail {
    path: string;
    message: string;
    value?: unknown;
}

/**
 * Error thrown when input validation fails
 */
export class ValidationError extends DomainError {
    constructor(message: string, details?: ValidationErrorDetail[]) {
        super(message, ErrorCode.VALIDATION_ERROR, 400, details);
    }

    /**
     * Creates a ValidationError from a single field error
     */
    static fromField(field: string, message: string, value?: unknown): ValidationError {
        return new ValidationError(`Validation failed for field '${field}': ${message}`, [
            { path: field, message, value },
        ]);
    }

    /**
     * Creates a ValidationError from multiple field errors
     */
    static fromFields(errors: ValidationErrorDetail[]): ValidationError {
        const message =
            errors.length === 1
                ? `Validation failed: ${errors[0].message}`
                : `Validation failed: ${errors.length} errors`;
        return new ValidationError(message, errors);
    }
}

/**
 * Error thrown when schema validation fails (e.g., Zod validation)
 */
export class SchemaValidationError extends ValidationError {
    constructor(errors: ValidationErrorDetail[]) {
        super('Schema validation failed', errors);
        this.code = ErrorCode.SCHEMA_VALIDATION_ERROR;
    }

    /**
     * Creates a SchemaValidationError from Zod errors
     */
    static fromZodErrors(
        zodErrors: Array<{ path: (string | number)[]; message: string }>
    ): SchemaValidationError {
        const details = zodErrors.map((err) => ({
            path: err.path.join('.'),
            message: err.message,
        }));
        return new SchemaValidationError(details);
    }
}

/**
 * Error thrown when input format is invalid
 */
export class InvalidInputError extends ValidationError {
    constructor(message: string, details?: unknown) {
        super(message, details as ValidationErrorDetail[]);
        this.code = ErrorCode.INVALID_INPUT;
    }
}
