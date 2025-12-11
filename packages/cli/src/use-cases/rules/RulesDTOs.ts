import { SyncStrategy } from '../../services/strategies.js';

// Request DTOs
export interface SyncRulesToToolRequest {
    toolId: string;
    targetPath: string;
    global?: boolean;
    strategy?: SyncStrategy;
    sourceId?: string; // Optional: ID of specific rule to sync
    backupOptions?: {
        maxBackups?: number;
        skipBackup?: boolean;
    };
    // Sync History tracking
    ruleName?: string;
    toolName?: string;
    triggeredBy?: 'manual' | 'auto' | 'watch';
}

export interface SyncRulesToAllToolsRequest {
    targetPath: string;
    strategy?: SyncStrategy;
    sourceId?: string;
}

export interface LoadMasterRulesRequest {
    // No parameters needed
}

// Response DTOs
export interface SyncRulesToToolResponse {
    success: boolean;
    toolId: string;
    targetPath: string;
    message?: string;
    historyId?: string; // Sync history entry ID
}

export interface SyncRulesToAllToolsResponse {
    success: boolean;
    results: Array<{
        toolId: string;
        toolName: string;
        status: 'success' | 'error' | 'skipped';
        targetPath?: string;
        message?: string;
        rulesFilename?: string;
    }>;
}

export interface LoadMasterRulesResponse {
    content: string;
    path: string;
}
