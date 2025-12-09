import { RulesConfig, Rule } from '../IRulesService.js';

export interface IRulesConfigRepository {
    load(): RulesConfig;
    save(config: RulesConfig): void;
    init(): void;

    // Multi-rules management
    getRulesList(): Promise<Rule[]>;
    getRule(id: string): Promise<Rule | null>;
    createRule(name: string, content: string): Promise<Rule>;
    updateRule(id: string, content: string): Promise<Rule>;
    deleteRule(id: string): Promise<void>;
    setActiveRule(id: string): Promise<void>;
}
