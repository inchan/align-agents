import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { ISyncConfigRepository } from '../../interfaces/repositories/ISyncConfigRepository.js';
import { SyncConfig } from '../../interfaces/ISyncService.js';
import { validateData } from '../../utils/validation.js';
import { SyncConfigSchema } from '../../schemas/mcp.schema.js';
import { KNOWN_TOOLS, getToolMetadata } from '../../constants/tools.js';

export class SyncConfigRepository implements ISyncConfigRepository {
    constructor(
        private fs: IFileSystem,
        private masterDir: string
    ) { }

    private getConfigPath(): string {
        return this.fs.join(this.masterDir, 'sync-config.json');
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

    private normalizeSyncConfig(raw: any): SyncConfig {
        if (raw && typeof raw === 'object' && raw.tools && typeof raw.tools === 'object') {
            raw = raw.tools;
        }

        const defaults = this.getDefaultSyncConfig();
        if (!raw || typeof raw !== 'object') {
            return defaults;
        }

        const result: SyncConfig = { ...defaults };

        for (const [toolId, value] of Object.entries(raw)) {
            if (!value || typeof value !== 'object') continue;
            const enabled = typeof (value as any).enabled === 'boolean' ? (value as any).enabled : true;
            const servers = Array.isArray((value as any).servers)
                ? (value as any).servers.filter((s: any) => typeof s === 'string')
                : null;

            result[toolId] = { enabled, servers };
        }

        return result;
    }

    load(): SyncConfig {
        const configPath = this.getConfigPath();

        let parsed: any = {};
        if (this.fs.exists(configPath)) {
            try {
                const data = this.fs.readFile(configPath);
                parsed = JSON.parse(data);
            } catch {
                parsed = {};
            }
        }

        return this.normalizeSyncConfig(parsed);
    }

    save(config: SyncConfig): void {
        const validatedConfig = validateData(SyncConfigSchema, config, 'Invalid sync config');

        for (const toolId of Object.keys(validatedConfig)) {
            const known = KNOWN_TOOLS.find(t => t.id === toolId);
            if (!known) {
                throw new Error(`Unknown tool in sync-config: ${toolId}`);
            }
        }

        if (!this.fs.exists(this.masterDir)) {
            this.fs.mkdir(this.masterDir);
        }

        const configPath = this.getConfigPath();
        this.fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    }
}
