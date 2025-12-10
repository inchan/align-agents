import { ISyncConfigRepository } from '../../interfaces/repositories/ISyncConfigRepository.js';
import { SyncConfig } from '../../interfaces/ISyncService.js';
import { IDatabase } from '../../interfaces/IDatabase.js';
import { validateData } from '../../utils/validation.js';
import { SyncConfigSchema } from '../../schemas/mcp.schema.js';
import { KNOWN_TOOLS, getToolMetadata } from '../../constants/tools.js';

/**
 * SQLite-based Sync Configuration Repository
 * Uses async wrappers for interface consistency
 */
export class SyncConfigRepository implements ISyncConfigRepository {
    constructor(private db: IDatabase) { }

    private async query<R>(fn: () => R): Promise<R> {
        return fn();
    }

    private getDefaultSyncConfig(): SyncConfig {
        const defaults: SyncConfig = {};
        for (const tool of KNOWN_TOOLS) {
            const meta = getToolMetadata(tool.id);
            const supportsMcp = meta?.supportsMcp ?? true;
            defaults[tool.id] = { enabled: supportsMcp, servers: null };
        }
        return defaults;
    }

    async load(): Promise<SyncConfig> {
        return this.query(() => {
            try {
                const rows = this.db.prepare<any>(`
                    SELECT tool_id, enabled, servers
                    FROM sync_config
                `).all();

                const defaults = this.getDefaultSyncConfig();
                const config: SyncConfig = { ...defaults };

                for (const row of rows) {
                    config[row.tool_id] = {
                        enabled: Boolean(row.enabled),
                        servers: row.servers ? JSON.parse(row.servers) : null
                    };
                }

                return config;
            } catch (error) {
                console.warn('[CLI] sync_config 테이블을 읽을 수 없어 기본 설정으로 대체합니다.', error);
                return this.getDefaultSyncConfig();
            }
        });
    }

    async save(config: SyncConfig): Promise<void> {
        return this.query(() => {
            const validatedConfig = validateData(SyncConfigSchema, config, 'Invalid sync config');

            // Validate all tool IDs
            for (const toolId of Object.keys(validatedConfig)) {
                const known = KNOWN_TOOLS.find(t => t.id === toolId);
                if (!known) {
                    throw new Error(`Unknown tool in sync-config: ${toolId}`);
                }
            }

            this.db.transaction(() => {
                // Clear existing config
                this.db.prepare('DELETE FROM sync_config').run();

                // Insert new config
                const stmt = this.db.prepare(`
                    INSERT INTO sync_config (tool_id, enabled, servers, updated_at)
                    VALUES (?, ?, ?, datetime('now'))
                `);

                for (const [toolId, value] of Object.entries(validatedConfig)) {
                    stmt.run(
                        toolId,
                        value.enabled ? 1 : 0,
                        value.servers ? JSON.stringify(value.servers) : null
                    );
                }
            });
        });
    }
}
