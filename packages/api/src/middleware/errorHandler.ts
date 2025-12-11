import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
    DomainError,
    ErrorCode,
    SchemaValidationError,
} from '@align-agents/errors';
import { getLogger } from '@align-agents/logger';

/**
 * Global error handler middleware for Express
 * Converts all errors to a consistent JSON format
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const logger = getLogger();
    const requestId = (req as any).requestId;

    // Handle DomainError instances
    if (DomainError.isDomainError(err)) {
        logger.warn({
            type: 'domain_error',
            code: err.code,
            message: err.message,
            statusCode: err.statusCode,
            details: err.details,
            requestId,
        }, 'Domain error occurred');

        res.status(err.statusCode).json(err.toApiResponse());
        return;
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
        const schemaError = SchemaValidationError.fromZodErrors(err.errors);

        logger.warn({
            type: 'validation_error',
            code: schemaError.code,
            errors: err.errors,
            requestId,
        }, 'Schema validation error');

        res.status(schemaError.statusCode).json(schemaError.toApiResponse());
        return;
    }

    // Handle unknown errors
    logger.error({
        type: 'unhandled_error',
        error: {
            name: err.name,
            message: err.message,
            stack: err.stack,
        },
        requestId,
    }, 'Unhandled error occurred');

    res.status(500).json({
        error: {
            code: ErrorCode.INTERNAL_ERROR,
            message: process.env.NODE_ENV === 'production'
                ? 'An unexpected error occurred'
                : err.message || 'An unexpected error occurred',
        },
    });
}

/**
 * Async error wrapper for route handlers
 * Catches promise rejections and forwards them to error handler
 */
export function asyncHandler(
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
