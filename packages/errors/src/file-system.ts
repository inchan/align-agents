import { DomainError } from './base.js';
import { ErrorCode } from './codes.js';

/**
 * Base error for file system operations
 */
export class FileSystemError extends DomainError {
    public readonly path?: string;

    constructor(message: string, path?: string, details?: unknown) {
        super(message, ErrorCode.FILE_SYSTEM_ERROR, 500, { path, ...((details as object) || {}) });
        this.path = path;
    }

    /**
     * Creates a FileSystemError from a Node.js error
     */
    static fromNodeError(error: NodeJS.ErrnoException, path?: string): FileSystemError {
        const filePath = path || error.path;

        switch (error.code) {
            case 'ENOENT':
                return new FileSystemError(`File or directory not found: ${filePath}`, filePath, {
                    errno: error.code,
                });
            case 'EACCES':
            case 'EPERM':
                return new PermissionError(filePath || 'unknown');
            case 'EEXIST':
                return new FileSystemError(`File already exists: ${filePath}`, filePath, {
                    errno: error.code,
                });
            case 'EISDIR':
                return new FileSystemError(`Expected file but found directory: ${filePath}`, filePath, {
                    errno: error.code,
                });
            case 'ENOTDIR':
                return new FileSystemError(`Expected directory but found file: ${filePath}`, filePath, {
                    errno: error.code,
                });
            default:
                return new FileSystemError(error.message || `File system error: ${filePath}`, filePath, {
                    errno: error.code,
                });
        }
    }
}

/**
 * Error thrown when file reading fails
 */
export class FileReadError extends FileSystemError {
    constructor(path: string, reason?: string) {
        const message = reason ? `Failed to read file '${path}': ${reason}` : `Failed to read file '${path}'`;
        super(message, path);
        this.code = ErrorCode.FILE_READ_ERROR;
    }
}

/**
 * Error thrown when file writing fails
 */
export class FileWriteError extends FileSystemError {
    constructor(path: string, reason?: string) {
        const message = reason ? `Failed to write file '${path}': ${reason}` : `Failed to write file '${path}'`;
        super(message, path);
        this.code = ErrorCode.FILE_WRITE_ERROR;
    }
}

/**
 * Error thrown when permission is denied
 */
export class PermissionError extends FileSystemError {
    constructor(path: string) {
        super(`Permission denied: ${path}`, path);
        this.code = ErrorCode.PERMISSION_DENIED;
        this.statusCode = 403;
    }
}
