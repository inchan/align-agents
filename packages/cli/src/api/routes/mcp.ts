import { FastifyInstance } from 'fastify';
import { McpService } from '../../services/impl/McpService.js';

export async function mcpRoutes(server: FastifyInstance, mcpService: McpService) {
    server.get('/api/mcps', async () => {
        return await mcpService.getMcpDefinitions();
    });

    server.post<{ Body: any }>('/api/mcps', async (request) => {
        return await mcpService.createMcpDefinition(request.body as any);
    });

    server.put<{ Params: { id: string }; Body: any }>('/api/mcps/:id', async (request) => {
        return await mcpService.updateMcpDefinition(request.params.id, request.body as any);
    });

    server.delete<{ Params: { id: string } }>('/api/mcps/:id', async (request) => {
        return await mcpService.deleteMcpDefinition(request.params.id);
    });

    server.get('/api/mcp-sets', async () => {
        return await mcpService.getMcpSets();
    });

    server.post<{ Body: { name: string; description?: string; items?: any } }>('/api/mcp-sets', async (request) => {
        console.log('[API] POST /mcp-sets body:', request.body);
        return await mcpService.createMcpSet(request.body.name, request.body.items, request.body.description);
    });

    server.put<{ Params: { id: string }; Body: { name?: string; description?: string; items?: any } }>('/api/mcp-sets/:id', async (request) => {
        return await mcpService.updateMcpSet(request.params.id, request.body);
    });

    server.delete<{ Params: { id: string } }>('/api/mcp-sets/:id', async (request) => {
        return await mcpService.deleteMcpSet(request.params.id);
    });

    server.put<{ Params: { id: string } }>('/api/mcp-sets/:id/activate', async (request) => {
        return await mcpService.setActiveMcpSet(request.params.id);
    });

    server.put<{ Body: { ids: string[] } }>('/api/mcp-sets/reorder', async (request, reply) => {
        try {
            return await mcpService.reorderMcpSets(request.body.ids);
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });
}
