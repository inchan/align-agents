import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';
import { SyncService } from './impl/SyncService.js';
import { SyncStrategy } from './strategies.js';
import type { McpServer, MasterMcpConfig, SyncConfig, GlobalConfig, SyncResultStatus } from '../interfaces/ISyncService.js';

// 싱글톤 인스턴스 생성
const fileSystem = new NodeFileSystem();
const syncService = new SyncService(fileSystem);

// 타입 재export
export type { McpServer, MasterMcpConfig, SyncConfig, GlobalConfig, SyncResultStatus };

// 함수 어댑터
export function getGlobalConfig(): GlobalConfig {
    return syncService.getGlobalConfig();
}

export function saveGlobalConfig(config: GlobalConfig): void {
    return syncService.saveGlobalConfig(config);
}

export function getMasterDir(): string {
    return syncService.getMasterDir();
}

export function setMasterDir(dir: string): void {
    return syncService.setMasterDir(dir);
}

// Master MCP methods removed

export function loadSyncConfig(): SyncConfig {
    return syncService.loadSyncConfig();
}

export function saveSyncConfig(config: SyncConfig): void {
    return syncService.saveSyncConfig(config);
}

export async function syncToolMcp(toolId: string, toolConfigPath: string, serverNames: string[] | null, strategy?: SyncStrategy, backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<string[]> {
    return syncService.syncToolMcp(toolId, toolConfigPath, serverNames, strategy, backupOptions, sourceId);
}

export async function syncAllTools(sourceId?: string): Promise<{ toolId: string; name: string; path: string; status: SyncResultStatus; message?: string; servers?: string[] }[]> {
    return syncService.syncAllTools(sourceId);
}
