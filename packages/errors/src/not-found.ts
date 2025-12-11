import { DomainError } from './base.js';
import { ErrorCode } from './codes.js';

/**
 * Error thrown when a requested resource is not found
 */
export class NotFoundError extends DomainError {
    public readonly resource: string;
    public readonly identifier?: string;

    constructor(resource: string, identifier?: string) {
        const message = identifier
            ? `${resource} with id '${identifier}' not found`
            : `${resource} not found`;
        super(message, ErrorCode.NOT_FOUND, 404, { resource, identifier });
        this.resource = resource;
        this.identifier = identifier;
    }
}

/**
 * Error thrown when a tool is not found
 */
export class ToolNotFoundError extends NotFoundError {
    constructor(toolId: string) {
        super('Tool', toolId);
        this.code = ErrorCode.TOOL_NOT_FOUND;
    }
}

/**
 * Error thrown when a configuration file is not found
 */
export class ConfigNotFoundError extends NotFoundError {
    public readonly path: string;

    constructor(configType: string, path: string) {
        super(`${configType} configuration`, path);
        this.code = ErrorCode.CONFIG_NOT_FOUND;
        this.path = path;
    }
}
