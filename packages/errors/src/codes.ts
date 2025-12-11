/**
 * Error codes for the domain errors
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
