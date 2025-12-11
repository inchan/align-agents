import { DomainError } from './base.js';
import { ErrorCode } from './codes.js';

/**
 * Base error for database operations
 */
export class DatabaseError extends DomainError {
    constructor(message: string, details?: unknown) {
        super(message, ErrorCode.DATABASE_ERROR, 500, details);
    }

    /**
     * Creates a DatabaseError from a SQLite error
     */
    static fromSqliteError(error: Error & { code?: string }): DatabaseError {
        const details = { sqliteCode: error.code };

        if (error.code === 'SQLITE_CONSTRAINT') {
            return new DatabaseError('Database constraint violation', details);
        }

        if (error.code === 'SQLITE_BUSY') {
            return new DatabaseError('Database is busy, please try again', details);
        }

        if (error.code === 'SQLITE_CORRUPT') {
            return new DatabaseError('Database is corrupted', details);
        }

        return new DatabaseError(error.message || 'Database operation failed', details);
    }
}

/**
 * Error thrown when a database query fails
 */
export class QueryError extends DatabaseError {
    public readonly query?: string;

    constructor(message: string, query?: string, details?: unknown) {
        super(message, { query, ...((details as object) || {}) });
        this.code = ErrorCode.QUERY_ERROR;
        this.query = query;
    }
}
