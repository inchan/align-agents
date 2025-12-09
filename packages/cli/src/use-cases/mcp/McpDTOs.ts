import { SyncStrategy } from '../../services/strategies.js';
import { McpServer } from '../../interfaces/ISyncService.js';

// Request DTOs
export interface SyncMcpToToolRequest {
    toolId: string;
    configPath: string;
    serverIds: string[];
    strategy?: SyncStrategy;
    sourceId?: string; // Optional: ID of specific MCP set to sync
}

import { ToolConfig } from '../../services/scanner.js';

export interface SyncMcpToAllToolsRequest {
    strategy?: SyncStrategy;
    registry?: { tools: ToolConfig[] };
    sourceId?: string; // Optional: ID of specific MCP set to sync
}

export interface LoadMasterMcpRequest {
    // No parameters needed
}

export interface AddMcpServerRequest {
    serverId: string;
    config: McpServer;
}

// Response DTOs
export interface SyncMcpToToolResponse {
    success: boolean;
    toolId: string;
    configPath: string;
    syncedServers: string[];
    message?: string;
}

export interface SyncMcpToAllToolsResponse {
    results: Array<{
        toolId: string;
        status: 'success' | 'error' | 'skipped';
        configPath?: string;
        syncedServers?: string[];
        message?: string;
    }>;
}

export interface LoadMasterMcpResponse {
    mcpServers: Record<string, McpServer>;
    path: string;
}

export interface AddMcpServerResponse {
    success: boolean;
    serverId: string;
    message?: string;
}
