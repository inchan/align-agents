import { FastifyInstance } from 'fastify';
import { SyncService } from '../../services/impl/SyncService.js';
import { ToolRepository } from '../../repositories/ToolRepository.js';
import { getToolMetadata } from '../../constants/tools.js';

export async function syncRoutes(server: FastifyInstance, syncService: SyncService) {
    server.get('/api/sync-config', async (request, reply) => {
        return syncService.loadSyncConfig();
    });

    server.post<{ Body: Record<string, any> }>('/api/sync-config', async (request, reply) => {
        try {
            syncService.saveSyncConfig(request.body as any);
            return { success: true };
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    server.post<{ Body: { toolId?: string; all?: boolean; sourceId?: string } }>('/api/mcp/sync', async (request, reply) => {
        const { toolId, all, sourceId } = request.body;

        try {
            if (all) {
                if (!sourceId) {
                    return reply.code(400).send({ error: 'Source ID (MCP Set ID) is required for sync' });
                }
                const results = await syncService.syncAllTools(sourceId);
                const success = results.every(r => r.status === 'success' || r.status === 'skipped');
                const { StatsService } = await import('../../services/StatsService.js');
                await StatsService.getInstance().recordSync(success, success ? 'All tools synced successfully' : 'Some tools failed to sync', { results });
                return { success: true, message: 'All tools synced', results };
            } else if (toolId) {
                if (!sourceId) {
                    return reply.code(400).send({ error: 'Source ID (MCP Set ID) is required for sync' });
                }

                const repo = ToolRepository.getInstance();
                await repo.load();
                const tool = repo.getTool(toolId);
                if (!tool) {
                    return reply.code(404).send({ error: 'Tool not found' });
                }
                // TOML check removed to support Codex

                const syncConfig = await syncService.loadSyncConfig();
                const toolSyncConfig = syncConfig[toolId];
                if (!toolSyncConfig) {
                    return reply.code(400).send({ error: 'Tool sync config not found' });
                }
                // Pass sourceId
                const servers = await syncService.syncToolMcp(toolId, tool.configPath, toolSyncConfig.servers, 'overwrite', undefined, sourceId);

                const { StatsService } = await import('../../services/StatsService.js');
                await StatsService.getInstance().recordSync(true, `Tool ${toolId} synced successfully`, { toolId, servers });

                return { success: true, message: `Tool ${toolId} synced` };
            } else {
                return reply.code(400).send({ error: 'Either toolId or all must be specified' });
            }
        } catch (error: any) {
            console.error('[API] MCP Sync Error:', error);
            const { StatsService } = await import('../../services/StatsService.js');
            await StatsService.getInstance().recordSync(false, `Sync failed: ${error.message}`, { error: error.message });

            let status = 500;
            if (error?.message?.includes('Unknown tool')) status = 400;
            if (error?.message?.includes('MCP Set not found')) status = 404;

            return reply.code(status).send({ error: error.message });
        }
    });

    server.get('/api/global-config', async (request, reply) => {
        return syncService.getGlobalConfig();
    });

    server.post<{ Body: Record<string, any> }>('/api/global-config', async (request, reply) => {
        try {
            syncService.saveGlobalConfig(request.body as any);
            return { success: true };
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    server.get('/api/sync/status', async (request, reply) => {
        const fs = await import('fs');
        const path = await import('path');
        const os = await import('os');

        const configDir = path.join(os.homedir(), '.align-agents');
        const masterDir = configDir;

        const rulesConfigPath = path.join(masterDir, 'rules-config.json');
        const syncConfigPath = path.join(masterDir, 'sync-config.json');

        let rulesConfig = {};
        let syncConfig = {};

        try {
            if (fs.existsSync(rulesConfigPath)) {
                rulesConfig = JSON.parse(fs.readFileSync(rulesConfigPath, 'utf-8'));
            }
        } catch (e) { console.warn('Failed to read rules-config', e); }

        try {
            if (fs.existsSync(syncConfigPath)) {
                syncConfig = JSON.parse(fs.readFileSync(syncConfigPath, 'utf-8'));
            }
        } catch (e) { console.warn('Failed to read sync-config', e); }

        return {
            rules: rulesConfig,
            mcp: syncConfig
        };
    });
}
