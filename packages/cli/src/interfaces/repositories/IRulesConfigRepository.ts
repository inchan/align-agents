import { RulesConfig, Rule } from '../IRulesService.js';

export interface IRulesConfigRepository {
    load(): Promise<RulesConfig>;
    save(config: RulesConfig): Promise<void>;
    init(): Promise<void>;

    // Multi-rules management
    getRulesList(): Promise<Rule[]>;
    getRule(id: string): Promise<Rule | null>;
    createRule(name: string, content: string): Promise<Rule>;
    updateRule(id: string, content: string, name?: string): Promise<Rule>;
    deleteRule(id: string): Promise<void>;
    getActiveRule(): Promise<Rule | null>;
    saveRulesList(rules: Rule[]): Promise<void>;
}
