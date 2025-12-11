import { DomainError } from './base.js';
import { ErrorCode } from './codes.js';

/**
 * Error thrown when a resource conflict occurs
 */
export class ConflictError extends DomainError {
    public readonly resource: string;
    public readonly field: string;
    public readonly value: string;

    constructor(resource: string, field: string, value: string) {
        const message = `${resource} with ${field} '${value}' already exists`;
        super(message, ErrorCode.CONFLICT, 409, { resource, field, value });
        this.resource = resource;
        this.field = field;
        this.value = value;
    }
}

/**
 * Error thrown when attempting to create a duplicate entry
 */
export class DuplicateEntryError extends ConflictError {
    constructor(resource: string, field: string, value: string) {
        super(resource, field, value);
        this.code = ErrorCode.DUPLICATE_ENTRY;
    }
}
