import { describe, it, expect } from 'vitest';
import {
    DomainError,
    ErrorCode,
    ValidationError,
    SchemaValidationError,
    InvalidInputError,
    NotFoundError,
    ToolNotFoundError,
    ConfigNotFoundError,
    ConflictError,
    DuplicateEntryError,
    FileSystemError,
    FileReadError,
    FileWriteError,
    PermissionError,
    DatabaseError,
    QueryError,
    SyncError,
    PartialSyncError,
    McpSyncError,
    RulesSyncError,
} from '../index.js';

describe('DomainError', () => {
    it('should create a base error with default values', () => {
        const error = new DomainError('Test error');

        expect(error.message).toBe('Test error');
        expect(error.code).toBe(ErrorCode.INTERNAL_ERROR);
        expect(error.statusCode).toBe(500);
        expect(error.details).toBeUndefined();
        expect(error.name).toBe('DomainError');
        expect(error.timestamp).toBeDefined();
    });

    it('should create an error with custom code and status', () => {
        const error = new DomainError('Custom error', ErrorCode.VALIDATION_ERROR, 400, { field: 'test' });

        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual({ field: 'test' });
    });

    it('should convert to JSON', () => {
        const error = new DomainError('Test error', ErrorCode.NOT_FOUND, 404);
        const json = error.toJSON();

        expect(json.name).toBe('DomainError');
        expect(json.code).toBe(ErrorCode.NOT_FOUND);
        expect(json.message).toBe('Test error');
        expect(json.statusCode).toBe(404);
        expect(json.timestamp).toBeDefined();
    });

    it('should convert to API response', () => {
        const error = new DomainError('Test error', ErrorCode.VALIDATION_ERROR, 400, { errors: ['field required'] });
        const response = error.toApiResponse();

        expect(response).toEqual({
            error: {
                code: ErrorCode.VALIDATION_ERROR,
                message: 'Test error',
                details: { errors: ['field required'] },
            },
        });
    });

    it('should check if error is DomainError', () => {
        const domainError = new DomainError('Test');
        const standardError = new Error('Test');

        expect(DomainError.isDomainError(domainError)).toBe(true);
        expect(DomainError.isDomainError(standardError)).toBe(false);
        expect(DomainError.isDomainError(null)).toBe(false);
        expect(DomainError.isDomainError('string')).toBe(false);
    });

    it('should wrap unknown errors', () => {
        const standardError = new Error('Original error');
        const wrapped = DomainError.from(standardError);

        expect(wrapped.message).toBe('Original error');
        expect(wrapped.code).toBe(ErrorCode.UNEXPECTED_ERROR);
        expect(wrapped.statusCode).toBe(500);
        expect((wrapped.details as any).originalError).toBe('Error');
    });

    it('should return same error if already DomainError', () => {
        const original = new ValidationError('Validation failed');
        const wrapped = DomainError.from(original);

        expect(wrapped).toBe(original);
    });
});

describe('ValidationError', () => {
    it('should create validation error', () => {
        const error = new ValidationError('Invalid input', [{ path: 'name', message: 'required' }]);

        expect(error.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual([{ path: 'name', message: 'required' }]);
    });

    it('should create from single field', () => {
        const error = ValidationError.fromField('email', 'must be a valid email', 'invalid');

        expect(error.message).toContain('email');
        expect(error.details).toEqual([{ path: 'email', message: 'must be a valid email', value: 'invalid' }]);
    });

    it('should create from multiple fields', () => {
        const errors = [
            { path: 'name', message: 'required' },
            { path: 'email', message: 'invalid format' },
        ];
        const error = ValidationError.fromFields(errors);

        expect(error.message).toContain('2 errors');
        expect(error.details).toEqual(errors);
    });
});

describe('SchemaValidationError', () => {
    it('should create from Zod errors', () => {
        const zodErrors = [
            { path: ['user', 'name'], message: 'Required' },
            { path: ['user', 'email'], message: 'Invalid email' },
        ];
        const error = SchemaValidationError.fromZodErrors(zodErrors);

        expect(error.code).toBe(ErrorCode.SCHEMA_VALIDATION_ERROR);
        expect(error.statusCode).toBe(400);
        expect(error.details).toEqual([
            { path: 'user.name', message: 'Required' },
            { path: 'user.email', message: 'Invalid email' },
        ]);
    });
});

describe('NotFoundError', () => {
    it('should create with resource name', () => {
        const error = new NotFoundError('User');

        expect(error.message).toBe('User not found');
        expect(error.code).toBe(ErrorCode.NOT_FOUND);
        expect(error.statusCode).toBe(404);
    });

    it('should create with resource name and id', () => {
        const error = new NotFoundError('User', '123');

        expect(error.message).toBe("User with id '123' not found");
        expect(error.resource).toBe('User');
        expect(error.identifier).toBe('123');
    });
});

describe('ToolNotFoundError', () => {
    it('should create tool not found error', () => {
        const error = new ToolNotFoundError('claude');

        expect(error.message).toBe("Tool with id 'claude' not found");
        expect(error.code).toBe(ErrorCode.TOOL_NOT_FOUND);
        expect(error.statusCode).toBe(404);
    });
});

describe('ConfigNotFoundError', () => {
    it('should create config not found error', () => {
        const error = new ConfigNotFoundError('MCP', '/path/to/config.json');

        expect(error.message).toContain('MCP configuration');
        expect(error.code).toBe(ErrorCode.CONFIG_NOT_FOUND);
        expect(error.path).toBe('/path/to/config.json');
    });
});

describe('ConflictError', () => {
    it('should create conflict error', () => {
        const error = new ConflictError('User', 'email', 'test@example.com');

        expect(error.message).toBe("User with email 'test@example.com' already exists");
        expect(error.code).toBe(ErrorCode.CONFLICT);
        expect(error.statusCode).toBe(409);
    });
});

describe('DuplicateEntryError', () => {
    it('should create duplicate entry error', () => {
        const error = new DuplicateEntryError('Rule', 'name', 'default');

        expect(error.code).toBe(ErrorCode.DUPLICATE_ENTRY);
        expect(error.statusCode).toBe(409);
    });
});

describe('FileSystemError', () => {
    it('should create from Node.js error', () => {
        const nodeError: NodeJS.ErrnoException = new Error('File not found');
        nodeError.code = 'ENOENT';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error.message).toContain('not found');
        expect(error.path).toBe('/path/to/file');
    });

    it('should create permission error from EACCES', () => {
        const nodeError: NodeJS.ErrnoException = new Error('Permission denied');
        nodeError.code = 'EACCES';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error).toBeInstanceOf(PermissionError);
        expect(error.statusCode).toBe(403);
    });
});

describe('FileReadError', () => {
    it('should create file read error', () => {
        const error = new FileReadError('/path/to/file', 'access denied');

        expect(error.message).toContain('Failed to read file');
        expect(error.code).toBe(ErrorCode.FILE_READ_ERROR);
        expect(error.path).toBe('/path/to/file');
    });
});

describe('FileWriteError', () => {
    it('should create file write error', () => {
        const error = new FileWriteError('/path/to/file');

        expect(error.message).toContain('Failed to write file');
        expect(error.code).toBe(ErrorCode.FILE_WRITE_ERROR);
    });
});

describe('PermissionError', () => {
    it('should create permission error', () => {
        const error = new PermissionError('/path/to/file');

        expect(error.message).toBe('Permission denied: /path/to/file');
        expect(error.code).toBe(ErrorCode.PERMISSION_DENIED);
        expect(error.statusCode).toBe(403);
    });
});

describe('DatabaseError', () => {
    it('should create from SQLite error', () => {
        const sqliteError = new Error('SQLITE_CONSTRAINT');
        (sqliteError as any).code = 'SQLITE_CONSTRAINT';

        const error = DatabaseError.fromSqliteError(sqliteError);

        expect(error.message).toContain('constraint violation');
        expect(error.code).toBe(ErrorCode.DATABASE_ERROR);
    });
});

describe('QueryError', () => {
    it('should create query error', () => {
        const error = new QueryError('Query failed', 'SELECT * FROM users');

        expect(error.code).toBe(ErrorCode.QUERY_ERROR);
        expect(error.query).toBe('SELECT * FROM users');
    });
});

describe('SyncError', () => {
    it('should create sync error with failed tools', () => {
        const error = new SyncError('Sync failed', ['claude', 'cursor']);

        expect(error.code).toBe(ErrorCode.SYNC_ERROR);
        expect(error.failedTools).toEqual(['claude', 'cursor']);
    });
});

describe('PartialSyncError', () => {
    it('should create partial sync error', () => {
        const failures = [
            { tool: 'claude', error: 'Permission denied' },
            { tool: 'cursor', error: 'Config not found' },
        ];
        const error = new PartialSyncError(3, 2, failures);

        expect(error.message).toContain('3 succeeded');
        expect(error.message).toContain('2 failed');
        expect(error.code).toBe(ErrorCode.PARTIAL_SYNC_ERROR);
        expect(error.successCount).toBe(3);
        expect(error.failedCount).toBe(2);
        expect(error.failures).toEqual(failures);
    });
});

describe('McpSyncError', () => {
    it('should create MCP sync error', () => {
        const error = new McpSyncError('claude', 'Config file not found');

        expect(error.message).toContain('Failed to sync MCP');
        expect(error.message).toContain('claude');
        expect(error.code).toBe(ErrorCode.MCP_SYNC_ERROR);
        expect(error.failedTools).toEqual(['claude']);
    });
});

describe('RulesSyncError', () => {
    it('should create rules sync error', () => {
        const error = new RulesSyncError('cursor');

        expect(error.message).toContain('Failed to sync rules');
        expect(error.message).toContain('cursor');
        expect(error.code).toBe(ErrorCode.RULES_SYNC_ERROR);
    });

    it('should create rules sync error with reason', () => {
        const error = new RulesSyncError('cursor', 'File not found');

        expect(error.message).toBe("Failed to sync rules for tool 'cursor': File not found");
    });
});

// Additional coverage tests
describe('DomainError - additional coverage', () => {
    it('should convert API response without details when undefined', () => {
        const error = new DomainError('Test error');
        const response = error.toApiResponse();

        expect(response.error.details).toBeUndefined();
        expect(response).toEqual({
            error: {
                code: ErrorCode.INTERNAL_ERROR,
                message: 'Test error',
            },
        });
    });

    it('should wrap non-Error objects', () => {
        const wrapped = DomainError.from({ custom: 'object' });

        expect(wrapped.code).toBe(ErrorCode.UNEXPECTED_ERROR);
        expect(wrapped.message).toBe('An unexpected error occurred');
        expect((wrapped.details as any).originalError).toEqual({ custom: 'object' });
    });

    it('should wrap string errors', () => {
        const wrapped = DomainError.from('String error message');

        expect(wrapped.message).toBe('String error message');
        expect(wrapped.code).toBe(ErrorCode.UNEXPECTED_ERROR);
    });

    it('should use default message when error has no message', () => {
        const errorWithoutMessage = new Error();
        errorWithoutMessage.message = '';
        const wrapped = DomainError.from(errorWithoutMessage, 'Custom default');

        expect(wrapped.message).toBe('Custom default');
    });
});

describe('DatabaseError - additional coverage', () => {
    it('should create from SQLITE_BUSY', () => {
        const sqliteError = new Error('Database busy');
        (sqliteError as any).code = 'SQLITE_BUSY';

        const error = DatabaseError.fromSqliteError(sqliteError);

        expect(error.message).toContain('busy');
    });

    it('should create from SQLITE_CORRUPT', () => {
        const sqliteError = new Error('Database corrupted');
        (sqliteError as any).code = 'SQLITE_CORRUPT';

        const error = DatabaseError.fromSqliteError(sqliteError);

        expect(error.message).toContain('corrupted');
    });

    it('should create from unknown SQLite error', () => {
        const sqliteError = new Error('Unknown error');
        (sqliteError as any).code = 'SQLITE_UNKNOWN';

        const error = DatabaseError.fromSqliteError(sqliteError);

        expect(error.message).toBe('Unknown error');
    });

    it('should use fallback message when SQLite error has no message', () => {
        const sqliteError = new Error();
        sqliteError.message = '';
        (sqliteError as any).code = 'SQLITE_UNKNOWN';

        const error = DatabaseError.fromSqliteError(sqliteError);

        expect(error.message).toBe('Database operation failed');
    });
});

describe('FileSystemError - additional coverage', () => {
    it('should create from EPERM error', () => {
        const nodeError: NodeJS.ErrnoException = new Error('Permission denied');
        nodeError.code = 'EPERM';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error).toBeInstanceOf(PermissionError);
    });

    it('should create from EEXIST error', () => {
        const nodeError: NodeJS.ErrnoException = new Error('File exists');
        nodeError.code = 'EEXIST';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error.message).toContain('already exists');
    });

    it('should create from EISDIR error', () => {
        const nodeError: NodeJS.ErrnoException = new Error('Is a directory');
        nodeError.code = 'EISDIR';
        nodeError.path = '/path/to/dir';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error.message).toContain('directory');
    });

    it('should create from ENOTDIR error', () => {
        const nodeError: NodeJS.ErrnoException = new Error('Not a directory');
        nodeError.code = 'ENOTDIR';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error.message).toContain('file');
    });

    it('should create from unknown error code', () => {
        const nodeError: NodeJS.ErrnoException = new Error('Unknown error');
        nodeError.code = 'EUNKNOWN';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error.message).toBe('Unknown error');
    });

    it('should use path from parameter when error.path is missing', () => {
        const nodeError: NodeJS.ErrnoException = new Error('File not found');
        nodeError.code = 'ENOENT';

        const error = FileSystemError.fromNodeError(nodeError, '/custom/path');

        expect(error.path).toBe('/custom/path');
    });

    it('should use fallback message when error has no message', () => {
        const nodeError: NodeJS.ErrnoException = new Error();
        nodeError.message = '';
        nodeError.code = 'EUNKNOWN';
        nodeError.path = '/path/to/file';

        const error = FileSystemError.fromNodeError(nodeError);

        expect(error.message).toContain('File system error');
    });
});

describe('InvalidInputError', () => {
    it('should create invalid input error', () => {
        const error = new InvalidInputError('Invalid format', { reason: 'bad data' } as any);

        expect(error.code).toBe(ErrorCode.INVALID_INPUT);
        expect(error.statusCode).toBe(400);
    });
});

describe('ValidationError - additional coverage', () => {
    it('should create from single field error', () => {
        const errors = [{ path: 'name', message: 'required' }];
        const error = ValidationError.fromFields(errors);

        expect(error.message).toBe('Validation failed: required');
    });
});

describe('McpSyncError - additional coverage', () => {
    it('should create MCP sync error without reason', () => {
        const error = new McpSyncError('claude');

        expect(error.message).toBe("Failed to sync MCP for tool 'claude'");
    });
});

describe('FileWriteError - additional coverage', () => {
    it('should create file write error with reason', () => {
        const error = new FileWriteError('/path/to/file', 'disk full');

        expect(error.message).toBe("Failed to write file '/path/to/file': disk full");
    });
});
