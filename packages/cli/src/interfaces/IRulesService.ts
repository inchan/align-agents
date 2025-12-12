import { SyncStrategy } from '../services/strategies.js';

export interface RulesConfig {
    [toolId: string]: {
        enabled: boolean;
        targetPath: string;
        global: boolean;
        ruleId?: string;
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
    orderIndex?: number;
    createdAt: string;
    updatedAt: string;
}

export interface IRulesService {
    // Configuration
    loadRulesConfig(): Promise<RulesConfig>;
    saveRulesConfig(config: RulesConfig): Promise<void>;
    getRulesConfig(): Promise<RulesConfig>;
    initRulesConfig(): Promise<void>;
    syncToolRules(toolId: string, targetPath: string, global: boolean, strategy: SyncStrategy, backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<void>;
    syncAllToolsRules(targetPath: string, strategy: SyncStrategy, sourceId?: string): Promise<RulesSyncResult[]>;
    listSupportedTools(): string[];

    // Multi-rules management
    getRulesList(): Promise<Rule[]>;
    getRule(id: string): Promise<Rule | null>;
    createRule(name: string, content: string): Promise<Rule>;
    updateRule(id: string, content: string, name?: string): Promise<Rule>;
    deleteRule(id: string): Promise<void>;
    setActiveRule(id: string): Promise<void>;
    deactivateRule(id: string): Promise<void>;
    reorderRules(ids: string[]): Promise<void>;
}
