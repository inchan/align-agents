import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';
import { RulesService } from './impl/RulesService.js';
import { SyncStrategy } from './strategies.js';
import { RulesConfig, RulesSyncResult } from '../interfaces/IRulesService.js';
import { getToolMetadata } from '../constants/tools.js';

// 싱글톤 인스턴스 생성
const fileSystem = new NodeFileSystem();
const rulesService = new RulesService(fileSystem);

export type { RulesConfig, RulesSyncResult };

export function loadMasterRules(): string {
    return rulesService.loadMasterRules();
}

export async function saveMasterRules(content: string): Promise<void> {
    return rulesService.saveMasterRules(content);
}

export function loadRulesConfig(): RulesConfig {
    return rulesService.loadRulesConfig();
}

export function saveRulesConfig(config: RulesConfig): void {
    return rulesService.saveRulesConfig(config);
}

export function getToolRulesFilename(toolId: string): string | null {
    const meta = getToolMetadata(toolId);
    return meta?.rulesFilename || null;
}

export async function syncToolRules(toolId: string, targetPath: string, global: boolean, strategy: SyncStrategy, backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<void> {
    return rulesService.syncToolRules(toolId, targetPath, global, strategy, backupOptions, sourceId);
}

export async function syncAllToolsRules(targetPath: string, strategy: SyncStrategy = 'overwrite', sourceId?: string): Promise<RulesSyncResult[]> {
    return rulesService.syncAllToolsRules(targetPath, strategy, sourceId);
}

export function initRulesConfig(): void {
    return rulesService.initRulesConfig();
}

export function listSupportedTools(): string[] {
    return rulesService.listSupportedTools();
}
