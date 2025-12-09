import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { IRulesConfigRepository } from '../../interfaces/repositories/IRulesConfigRepository.js';
import { RulesConfig, Rule } from '../../interfaces/IRulesService.js';
import { validateData } from '../../utils/validation.js';
import { RulesConfigSchema } from '../../schemas/rules.schema.js';
import { getToolMetadata, getRulesCapableTools } from '../../constants/tools.js';
import { randomUUID } from 'crypto';

export class RulesConfigRepository implements IRulesConfigRepository {
    constructor(
        private fs: IFileSystem,
        private masterDir: string
    ) { }

    private getConfigPath(): string {
        return this.fs.join(this.masterDir, 'rules-config.json');
    }

    private getRulesListPath(): string {
        return this.fs.join(this.masterDir, 'rules', 'index.json');
    }

    private getMasterRulesPath(): string {
        return this.fs.join(this.masterDir, 'master-rules.md');
    }

    load(): RulesConfig {
        const configPath = this.getConfigPath();

        if (this.fs.exists(configPath)) {
            try {
                const data = this.fs.readFile(configPath);
                return JSON.parse(data);
            } catch (error) {
                console.warn(`[CLI] rules-config.json을 파싱할 수 없어 빈 설정으로 대체합니다. (${configPath})`, error);
                return {};
            }
        }

        return {};
    }

    save(config: RulesConfig): void {
        const validatedConfig = validateData(RulesConfigSchema, config, 'Invalid rules config');

        Object.keys(validatedConfig).forEach(toolId => {
            const meta = getToolMetadata(toolId);
            if (!meta?.rulesFilename) {
                throw new Error(`Unknown tool in rules-config: ${toolId}`);
            }
        });

        if (!this.fs.exists(this.masterDir)) {
            this.fs.mkdir(this.masterDir);
        }

        const configPath = this.getConfigPath();
        this.fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    }

    init(): void {
        const configPath = this.getConfigPath();

        if (this.fs.exists(configPath)) {
            return;
        }

        const defaultConfig: RulesConfig = {};
        const rulesTools = getRulesCapableTools();

        for (const tool of rulesTools) {
            defaultConfig[tool.id] = {
                enabled: true,
                targetPath: '',
                global: true,
            };
        }

        this.save(defaultConfig);
        console.log(`[CLI] rules-config.json이 생성되었습니다: ${configPath}`);
    }

    // Multi-rules management implementation

    async getRulesList(): Promise<Rule[]> {
        const listPath = this.getRulesListPath();

        if (this.fs.exists(listPath)) {
            try {
                const data = this.fs.readFile(listPath);
                const json = JSON.parse(data);
                return json.rules || [];
            } catch (error) {
                console.error('Failed to parse rules list:', error);
                return [];
            }
        }

        // Migration: If list.json doesn't exist but master-rules.md does
        const masterPath = this.getMasterRulesPath();
        if (this.fs.exists(masterPath)) {
            const content = this.fs.readFile(masterPath);
            const defaultRule: Rule = {
                id: randomUUID(),
                name: 'Default Rules',
                content: content,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            await this.saveRulesList([defaultRule]);
            return [defaultRule];
        }

        return [];
    }

    async getRule(id: string): Promise<Rule | null> {
        const rules = await this.getRulesList();
        return rules.find(r => r.id === id) || null;
    }

    async createRule(name: string, content: string): Promise<Rule> {
        const rules = await this.getRulesList();

        // If this is the first rule, make it active
        const isActive = rules.length === 0;

        const newRule: Rule = {
            id: randomUUID(),
            name,
            content,
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        rules.push(newRule);
        await this.saveRulesList(rules);

        if (isActive) {
            await this.updateMasterRulesFile(content);
        }

        return newRule;
    }

    async updateRule(id: string, content: string, name?: string): Promise<Rule> {
        const rules = await this.getRulesList();
        const index = rules.findIndex(r => r.id === id);

        if (index === -1) {
            throw new Error(`Rule not found: ${id}`);
        }

        rules[index].content = content;
        if (name !== undefined) {
            rules[index].name = name;
        }
        rules[index].updatedAt = new Date().toISOString();

        await this.saveRulesList(rules);

        if (rules[index].isActive) {
            await this.updateMasterRulesFile(content);
        }

        return rules[index];
    }

    async deleteRule(id: string): Promise<void> {
        const rules = await this.getRulesList();
        const rule = rules.find(r => r.id === id);

        if (!rule) {
            throw new Error(`Rule not found: ${id}`);
        }

        if (rule.isActive) {
            throw new Error('Cannot delete active rule');
        }

        const newRules = rules.filter(r => r.id !== id);
        await this.saveRulesList(newRules);
    }

    async setActiveRule(id: string): Promise<void> {
        const rules = await this.getRulesList();
        const index = rules.findIndex(r => r.id === id);

        if (index === -1) {
            throw new Error(`Rule not found: ${id}`);
        }

        // Deactivate all
        rules.forEach(r => r.isActive = false);

        // Activate target
        rules[index].isActive = true;

        await this.saveRulesList(rules);
        await this.updateMasterRulesFile(rules[index].content);
    }

    private async saveRulesList(rules: Rule[]): Promise<void> {
        const listPath = this.getRulesListPath();
        const dir = this.fs.dirname(listPath);

        console.log(`[CLI] DEBUG: saveRulesList - listPath=${listPath}, dir=${dir}`);

        if (!this.fs.exists(dir)) {
            console.log(`[CLI] DEBUG: Creating directory: ${dir}`);
            // Create parent directory first if needed
            const parentDir = this.fs.dirname(dir);
            if (!this.fs.exists(parentDir)) {
                this.fs.mkdir(parentDir);
            }
            this.fs.mkdir(dir);
        }

        const content = JSON.stringify({ rules }, null, 2);
        console.log(`[CLI] DEBUG: Writing rules list - ${rules.length} rules`);
        this.fs.writeFile(listPath, content);
        console.log(`[CLI] DEBUG: Rules list saved successfully`);
    }

    private async updateMasterRulesFile(content: string): Promise<void> {
        const masterPath = this.getMasterRulesPath();
        this.fs.writeFile(masterPath, content);
    }
}
