import { DomainError } from './base.js';
import { ErrorCode } from './codes.js';

export interface SyncFailure {
    tool: string;
    error: string;
}

/**
 * Base error for synchronization operations
 */
export class SyncError extends DomainError {
    public readonly failedTools?: string[];

    constructor(message: string, failedTools?: string[], details?: unknown) {
        super(message, ErrorCode.SYNC_ERROR, 500, { failedTools, ...((details as object) || {}) });
        this.failedTools = failedTools;
    }
}

/**
 * Error thrown when synchronization partially fails
 */
export class PartialSyncError extends SyncError {
    public readonly successCount: number;
    public readonly failedCount: number;
    public readonly failures: SyncFailure[];

    constructor(successCount: number, failedCount: number, failures: SyncFailure[]) {
        const message = `Sync partially failed: ${successCount} succeeded, ${failedCount} failed`;
        super(
            message,
            failures.map((f) => f.tool),
            { successCount, failedCount, failures }
        );
        this.code = ErrorCode.PARTIAL_SYNC_ERROR;
        this.successCount = successCount;
        this.failedCount = failedCount;
        this.failures = failures;
    }
}

/**
 * Error thrown when MCP synchronization fails
 */
export class McpSyncError extends SyncError {
    constructor(toolId: string, reason?: string) {
        const message = reason
            ? `Failed to sync MCP for tool '${toolId}': ${reason}`
            : `Failed to sync MCP for tool '${toolId}'`;
        super(message, [toolId]);
        this.code = ErrorCode.MCP_SYNC_ERROR;
    }
}

/**
 * Error thrown when rules synchronization fails
 */
export class RulesSyncError extends SyncError {
    constructor(toolId: string, reason?: string) {
        const message = reason
            ? `Failed to sync rules for tool '${toolId}': ${reason}`
            : `Failed to sync rules for tool '${toolId}'`;
        super(message, [toolId]);
        this.code = ErrorCode.RULES_SYNC_ERROR;
    }
}
