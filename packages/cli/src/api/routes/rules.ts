import { FastifyInstance } from 'fastify';
import { RulesService } from '../../services/impl/RulesService.js';

export async function rulesRoutes(server: FastifyInstance, rulesService: RulesService) {
    server.get('/api/rules-config', async (request, reply) => {
        return rulesService.loadRulesConfig();
    });

    server.post<{ Body: any }>('/api/rules-config', async (request, reply) => {
        try {
            rulesService.saveRulesConfig(request.body as any);
            return { success: true };
        } catch (error: any) {
            return reply.code(400).send({ error: error.message });
        }
    });

    /**
     * Rules 동기화 API
     * - toolId 지정: 해당 도구만 동기화
     * - toolId 미지정 (null, undefined, ''): 전체 도구 동기화 (기본값)
     */
    server.post<{ Body: { toolId?: string; projectPath?: string; global?: boolean; sourceId?: string; strategy?: string } }>('/api/rules/sync', async (request, reply) => {
        const { toolId, projectPath, global, sourceId, strategy } = request.body;
        const syncStrategy = (strategy as any) || 'smart-update';

        if (!sourceId) {
            return reply.code(400).send({ error: 'Source ID is required for sync' });
        }

        try {
            const { StatsService } = await import('../../services/StatsService.js');

            // toolId 미지정 시 전체 도구 동기화
            if (!toolId) {
                if (!projectPath) {
                    return reply.code(400).send({ error: 'Project path is required for sync all' });
                }
                const results = await rulesService.syncAllToolsRules(projectPath, syncStrategy, sourceId);
                const success = results.every(r => r.status === 'success' || r.status === 'skipped');
                await StatsService.getInstance().recordSync(success, success ? 'All rules synced successfully' : 'Some rules failed to sync', { results, type: 'rules' });
                return { success: true, message: 'All tools synced', results };
            }

            // toolId가 있으면 단일 도구 동기화
            await rulesService.syncToolRules(toolId, projectPath || '', global !== undefined ? global : true, syncStrategy, undefined, sourceId);
            await StatsService.getInstance().recordSync(true, `Rules for ${toolId} synced successfully`, { toolId, type: 'rules' });
            return { success: true, message: `Tool ${toolId} synced` };
        } catch (error: any) {
            console.error(error);
            const { StatsService } = await import('../../services/StatsService.js');
            await StatsService.getInstance().recordSync(false, `Rules sync failed: ${error.message}`, { error: error.message, type: 'rules' });
            return reply.code(500).send({ error: error.message });
        }
    });

    server.get('/api/rules', async (request, reply) => {
        try {
            return await rulesService.getRulesList();
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    server.post<{ Body: { name: string; content: string } }>('/api/rules', async (request, reply) => {
        const { name, content } = request.body;

        if (!name || !name.trim()) {
            return reply.code(400).send({ error: 'Rule name is required' });
        }

        try {
            return await rulesService.createRule(name, content || '');
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    server.put<{ Params: { id: string }; Body: { content: string; name?: string } }>('/api/rules/:id', async (request, reply) => {
        const { id } = request.params;
        const { content, name } = request.body;

        try {
            return await rulesService.updateRule(id, content, name);
        } catch (error: any) {
            const status = error.message.includes('not found') ? 404 : 500;
            return reply.code(status).send({ error: error.message });
        }
    });

    server.delete<{ Params: { id: string } }>('/api/rules/:id', async (request, reply) => {
        const { id } = request.params;

        try {
            await rulesService.deleteRule(id);
            return { success: true };
        } catch (error: any) {
            const status = error.message.includes('not found') ? 404 : 500;
            return reply.code(status).send({ error: error.message });
        }
    });

    server.put<{ Params: { id: string } }>('/api/rules/:id/activate', async (request, reply) => {
        const { id } = request.params;

        try {
            await rulesService.setActiveRule(id);
            return { success: true };
        } catch (error: any) {
            const status = error.message.includes('not found') ? 404 : 500;
            return reply.code(status).send({ error: error.message });
        }
    });

    server.put<{ Body: { ids: string[] } }>('/api/rules/reorder', async (request, reply) => {
        try {
            return await rulesService.reorderRules(request.body.ids);
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });
}
