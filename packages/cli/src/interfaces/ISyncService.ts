import { SyncStrategy } from '../services/strategies.js';

import { ToolConfig } from '../repositories/ToolRepository.js';

export interface McpServer {
    command: string;
    args: string[];
    description?: string;
    category?: string;
    env?: Record<string, string>;
}

export interface MasterMcpConfig {
    mcpServers: Record<string, McpServer>;
}

export interface SyncConfig {
    [toolId: string]: {
        enabled: boolean;
        servers: string[] | null;
    };
}

export interface GlobalConfig {
    masterDir: string;
    autoBackup: boolean;
}

export type SyncResultStatus = 'success' | 'skipped' | 'error' | 'unsupported';

export interface SyncResult {
    toolId: string;
    name: string;
    path: string;
    status: SyncResultStatus;
    message?: string;
    servers?: string[];
}

export interface ISyncService {
    getGlobalConfig(): GlobalConfig;
    saveGlobalConfig(config: GlobalConfig): void;
    getMasterDir(): string;
    setMasterDir(dir: string): void;
    loadMasterMcp(): MasterMcpConfig;
    saveMasterMcp(config: MasterMcpConfig): Promise<void>;
    loadSyncConfig(): SyncConfig;
    saveSyncConfig(config: SyncConfig): void;
    syncToolMcp(toolId: string, toolConfigPath: string, serverNames: string[] | null, strategy?: SyncStrategy, backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<string[]>;
    syncAllTools(sourceId?: string, tools?: ToolConfig[]): Promise<SyncResult[]>;
    syncTool(toolId: string, options?: SyncOptions): Promise<void>;
}

export interface SyncOptions {
    mcpStrategy?: SyncStrategy;
    rulesStrategy?: SyncStrategy;
    backup?: {
        maxBackups?: number;
        skipBackup?: boolean;
    };
}
