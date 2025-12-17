import { IRulesConfigRepository } from '../../interfaces/repositories/IRulesConfigRepository.js';
import { RulesConfig, Rule, GetRulesListOptions } from '../../interfaces/IRulesService.js';
import { IDatabase } from '../../interfaces/IDatabase.js';
import { validateData } from '../../utils/validation.js';
import { RulesConfigSchema } from '../../schemas/rules.schema.js';
import { getToolMetadata, getRulesCapableTools } from '../../constants/tools.js';
import { randomUUID } from 'crypto';

/**
 * SQLite-based Rules Configuration Repository
 * Uses async wrappers around synchronous better-sqlite3 calls for:
 * 1. Interface consistency across all repositories
 * 2. Future extensibility (easy migration to async DB like PostgreSQL)
 * 3. Minimal code changes in calling code
 */
export class RulesConfigRepository implements IRulesConfigRepository {
    constructor(private db: IDatabase) { }

    /**
     * Helper to wrap synchronous operations in Promise
     * Maintains async interface while using sync SQLite
     */
    private async query<R>(fn: () => R): Promise<R> {
        return fn();
    }

    async load(): Promise<RulesConfig> {
        return this.query(() => {
            try {
                const rows = this.db.prepare<any>(`
                    SELECT tool_id, enabled, target_path, global
                    FROM rules_config
                `).all();

                const config: RulesConfig = {};
                for (const row of rows) {
                    config[row.tool_id] = {
                        enabled: Boolean(row.enabled),
                        targetPath: row.target_path,
                        global: Boolean(row.global)
                    };
                }

                return config;
            } catch (error) {
                console.warn('[CLI] rules_config 테이블을 읽을 수 없어 빈 설정으로 대체합니다.', error);
                return {};
            }
        });
    }

    async save(config: RulesConfig): Promise<void> {
        return this.query(() => {
            const validatedConfig = validateData(RulesConfigSchema, config, 'Invalid rules config');

            // Validate all tool IDs
            Object.keys(validatedConfig).forEach(toolId => {
                const meta = getToolMetadata(toolId);
                if (!meta?.rulesFilename) {
                    throw new Error(`Unknown tool in rules-config: ${toolId}`);
                }
            });

            this.db.transaction(() => {
                // Clear existing config
                this.db.prepare('DELETE FROM rules_config').run();

                // Insert new config
                const stmt = this.db.prepare(`
                    INSERT INTO rules_config (tool_id, enabled, target_path, global, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                `);

                for (const [toolId, value] of Object.entries(validatedConfig)) {
                    stmt.run(
                        toolId,
                        value.enabled ? 1 : 0,
                        value.targetPath,
                        value.global ? 1 : 0
                    );
                }
            });
        });
    }

    async init(): Promise<void> {
        return this.query(() => {
            // Check if config already exists
            const count = this.db.prepare<{ count: number }>(`
                SELECT COUNT(*) as count FROM rules_config
            `).get();

            if (count && count.count > 0) {
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

            // Use sync version of save within this query
            const validatedConfig = validateData(RulesConfigSchema, defaultConfig, 'Invalid rules config');

            this.db.transaction(() => {
                const stmt = this.db.prepare(`
                    INSERT INTO rules_config (tool_id, enabled, target_path, global, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'))
                `);

                for (const [toolId, value] of Object.entries(validatedConfig)) {
                    stmt.run(
                        toolId,
                        value.enabled ? 1 : 0,
                        value.targetPath,
                        value.global ? 1 : 0
                    );
                }
            });

            console.log('[CLI] rules_config 테이블이 초기화되었습니다.');
        });
    }

    async getRulesList(options?: GetRulesListOptions): Promise<Rule[]> {
        return this.query(() => {
            try {
                const isArchived = options?.isArchived ?? false;
                const rows = this.db.prepare<any>(`
                    SELECT id, name, content, order_index, created_at, updated_at
                    FROM rules
                    WHERE is_archived = ?
                    ORDER BY order_index ASC, created_at DESC
                `).all(isArchived ? 1 : 0);

                return rows.map(row => ({
                    id: row.id,
                    name: row.name,
                    content: row.content,
                    orderIndex: row.order_index,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                }));
            } catch (error) {
                console.warn('[CLI] rules 테이블을 읽을 수 없어 빈 목록으로 대체합니다.', error);
                return [];
            }
        });
    }

    async saveRulesList(rules: Rule[]): Promise<void> {
        return this.query(() => {
            this.db.transaction(() => {
                // Clear existing rules
                this.db.prepare('DELETE FROM rules').run();

                // Insert new rules
                const stmt = this.db.prepare(`
                    INSERT INTO rules (id, name, content, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `);

                for (const rule of rules) {
                    stmt.run(
                        rule.id,
                        rule.name,
                        rule.content,
                        rule.createdAt,
                        rule.updatedAt
                    );
                }
            });
        });
    }

    async getRule(id: string): Promise<Rule | null> {
        return this.query(() => {
            try {
                const row = this.db.prepare<any>(`
                    SELECT id, name, content, order_index, created_at, updated_at
                    FROM rules
                    WHERE id = ? AND is_archived = 0
                `).get(id);

                if (!row) {
                    return null;
                }

                return {
                    id: row.id,
                    name: row.name,
                    content: row.content,
                    orderIndex: row.order_index,
                    createdAt: row.created_at,
                    updatedAt: row.updated_at
                };
            } catch (error) {
                console.warn(`[CLI] Rule ${id}를 읽을 수 없습니다.`, error);
                return null;
            }
        });
    }

    async createRule(name: string, content: string): Promise<Rule> {
        return this.query(() => {
            const now = new Date().toISOString();
            const maxOrder = this.db.prepare<{ maxIndex: number }>(`
                SELECT MAX(order_index) as maxIndex FROM rules
            `).get();
            const nextOrder = (maxOrder?.maxIndex ?? 0) + 1;

            const rule: Rule = {
                id: randomUUID(),
                name,
                content,
                orderIndex: nextOrder,
                createdAt: now,
                updatedAt: now
            };

            this.db.prepare(`
                INSERT INTO rules (id, name, content, order_index, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(
                rule.id,
                rule.name,
                rule.content,
                rule.orderIndex,
                rule.createdAt,
                rule.updatedAt
            );

            return rule;
        });
    }

    async updateRule(id: string, content: string, name?: string): Promise<Rule> {
        return this.query(async () => {
            const existing = await this.getRule(id);
            if (!existing) {
                throw new Error(`Rule not found: ${id}`);
            }

            const updated: Rule = {
                ...existing,
                content,
                ...(name && { name }),
                updatedAt: new Date().toISOString()
            };

            this.db.prepare(`
                UPDATE rules
                SET name = ?, content = ?, updated_at = ?
                WHERE id = ?
            `).run(
                updated.name,
                updated.content,
                updated.updatedAt,
                id
            );

            return updated;
        });
    }

    async deleteRule(id: string): Promise<void> {
        return this.query(() => {
            // Soft delete
            const now = new Date().toISOString();
            this.db.prepare(`
                UPDATE rules
                SET is_archived = 1, updated_at = ?
                WHERE id = ?
            `).run(now, id);
        });
    }

    async reorderRules(ids: string[]): Promise<void> {
        return this.query(() => {
            this.db.transaction(() => {
                const stmt = this.db.prepare(`
                    UPDATE rules
                    SET order_index = ?, updated_at = datetime('now')
                    WHERE id = ?
                `);

                ids.forEach((id, index) => {
                    stmt.run(index, id);
                });
            });
        });
    }
}
