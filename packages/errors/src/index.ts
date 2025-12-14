// Error codes
export { ErrorCode, type ErrorCodeType } from './codes.js';

// Base error
export { DomainError } from './base.js';

// Validation errors
export {
    ValidationError,
    SchemaValidationError,
    InvalidInputError,
    type ValidationErrorDetail,
} from './validation.js';

// Not found errors
export { NotFoundError, ToolNotFoundError, ConfigNotFoundError } from './not-found.js';

// Conflict errors
export { ConflictError, DuplicateEntryError } from './conflict.js';

// File system errors
export {
    FileSystemError,
    FileReadError,
    FileWriteError,
    PermissionError,
} from './file-system.js';

// Database errors
export { DatabaseError, QueryError } from './database.js';

// Sync errors
export {
    SyncError,
    PartialSyncError,
    McpSyncError,
    RulesSyncError,
    type SyncFailure,
} from './sync.js';
