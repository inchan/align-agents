import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { SchemaValidationError } from '@align-agents/errors';

/**
 * Zod schema validation middleware factory
 *
 * @param schema - Zod schema to validate against
 * @param source - Where to find the data to validate ('body' | 'query' | 'params')
 * @returns Express middleware function
 */
export function validateRequest<T>(
    schema: ZodSchema<T>,
    source: 'body' | 'query' | 'params' = 'body'
) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const data = req[source];
            const validated = schema.parse(data);

            // Replace original data with validated data
            (req as any)[source] = validated;

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const schemaError = SchemaValidationError.fromZodErrors(error.errors);
                return res.status(schemaError.statusCode).json(schemaError.toApiResponse());
            }

            // Forward unknown errors to global error handler
            next(error);
        }
    };
}

/**
 * Validate multiple sources at once
 */
export function validateMultiple(schemas: {
    body?: ZodSchema;
    query?: ZodSchema;
    params?: ZodSchema;
}) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            if (schemas.body) {
                req.body = schemas.body.parse(req.body);
            }
            if (schemas.query) {
                (req as any).query = schemas.query.parse(req.query);
            }
            if (schemas.params) {
                req.params = schemas.params.parse(req.params) as any;
            }

            next();
        } catch (error) {
            if (error instanceof ZodError) {
                const schemaError = SchemaValidationError.fromZodErrors(error.errors);
                return res.status(schemaError.statusCode).json(schemaError.toApiResponse());
            }

            // Forward unknown errors to global error handler
            next(error);
        }
    };
}
