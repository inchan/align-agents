import { IGlobalConfigRepository } from '../../interfaces/repositories/IGlobalConfigRepository.js';
import { GlobalConfig } from '../../interfaces/ISyncService.js';
import { IDatabase } from '../../interfaces/IDatabase.js';
import { validateData } from '../../utils/validation.js';
import { GlobalConfigSchema } from '../../schemas/rules.schema.js';

/**
 * SQLite-based Global Configuration Repository
 * Uses async wrappers for interface consistency
 */
export class GlobalConfigRepository implements IGlobalConfigRepository {
    constructor(
        private db: IDatabase,
        private defaultConfig: GlobalConfig
    ) { }

    private async query<R>(fn: () => R): Promise<R> {
        return fn();
    }

    private getDefaultConfig(): GlobalConfig {
        return this.defaultConfig;
    }

    async init(): Promise<void> {
        return this.query(async () => {
            // Check if config already exists
            const count = this.db.prepare<{ count: number }>(`
                SELECT COUNT(*) as count FROM global_config
            `).get();

            if (count && count.count > 0) {
                return;
            }

            const defaultConfig = this.getDefaultConfig();
            await this.save(defaultConfig);
            console.log('[CLI] global_config 테이블이 초기화되었습니다.');
        });
    }

    async load(): Promise<GlobalConfig> {
        return this.query(() => {
            try {
                const rows = this.db.prepare<any>(`
                    SELECT key, value
                    FROM global_config
                `).all();

                if (rows.length === 0) {
                    return this.getDefaultConfig();
                }

                const config: any = {};
                for (const row of rows) {
                    // Parse value based on key type
                    const key = row.key;
                    let value = row.value;

                    // Handle boolean values
                    if (value === 'true') value = true;
                    else if (value === 'false') value = false;
                    // Handle numeric values
                    else if (!isNaN(Number(value))) value = Number(value);

                    config[key] = value;
                }

                // Merge with defaults to ensure all keys exist
                return { ...this.getDefaultConfig(), ...config };
            } catch (error) {
                console.warn('[CLI] global_config 테이블을 읽을 수 없어 기본 설정으로 대체합니다.', error);
                return this.getDefaultConfig();
            }
        });
    }

    async save(config: GlobalConfig): Promise<void> {
        return this.query(() => {
            const validatedConfig = validateData(GlobalConfigSchema, config, 'Invalid global config');

            this.db.transaction(() => {
                // Clear existing config
                this.db.prepare('DELETE FROM global_config').run();

                // Insert new config
                const stmt = this.db.prepare(`
                    INSERT INTO global_config (key, value, updated_at)
                    VALUES (?, ?, datetime('now'))
                `);

                for (const [key, value] of Object.entries(validatedConfig)) {
                    // Convert value to string for storage
                    const stringValue = typeof value === 'object'
                        ? JSON.stringify(value)
                        : String(value);

                    stmt.run(key, stringValue);
                }
            });
        });
    }
}
