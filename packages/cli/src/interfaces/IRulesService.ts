import { SyncStrategy } from '../services/strategies.js';

export interface RulesConfig {
    [toolId: string]: {
        enabled: boolean;
        targetPath: string;
        global: boolean;
    };
}

export interface RulesSyncResult {
    toolId: string;
    toolName: string;
    status: 'success' | 'skipped' | 'error' | 'not-supported';
    message?: string;
    targetPath?: string;
    rulesFilename?: string;
}

export interface Rule {
    id: string;
    name: string;
    content: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface IRulesService {
    loadMasterRules(): string;
    saveMasterRules(content: string): Promise<void>;
    loadRulesConfig(): RulesConfig;
    saveRulesConfig(config: RulesConfig): void;
    syncToolRules(toolId: string, targetPath: string, global: boolean, strategy: SyncStrategy, backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<void>;
    syncAllToolsRules(targetPath: string, strategy: SyncStrategy, sourceId?: string): Promise<RulesSyncResult[]>;
    initRulesConfig(): void;
    listSupportedTools(): string[];

    // Multi-rules management
    getRulesList(): Promise<Rule[]>;
    getRule(id: string): Promise<Rule | null>;
    createRule(name: string, content: string): Promise<Rule>;
    updateRule(id: string, content: string, name?: string): Promise<Rule>;
    deleteRule(id: string): Promise<void>;
    setActiveRule(id: string): Promise<void>;
}
