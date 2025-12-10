import { Request, Response } from 'express';
import { syncService, mcpService } from '../container.js';
import {
    SyncMcpToToolUseCase,
    SyncMcpToAllToolsUseCase,
    scanForTools
} from '@align-agents/cli';

export class McpController {
    // Master MCP methods removed

    async sync(req: Request, res: Response) {
        try {
            const { toolId, strategy, sourceId, global, targetPath } = req.body;

            if (!sourceId) {
                return res.status(400).json({ error: 'Source ID(MCP Set ID) is required for sync.' });
            }

            if (toolId) {
                const resolvedConfigPath = await this.resolveConfigPath(toolId, global, targetPath, req.body.configPath);
                if (!resolvedConfigPath) {
                    return res.status(400).json({ error: '유효한 설정 경로를 찾을 수 없습니다. (프로젝트 모드인 경우 targetPath 필수)' });
                }

                const serverIds = Array.isArray(req.body.serverIds)
                    ? req.body.serverIds.filter((id: unknown) => typeof id === 'string')
                    : undefined;

                const useCase = new SyncMcpToToolUseCase(syncService);
                const result = await useCase.execute({
                    toolId,
                    configPath: resolvedConfigPath,
                    serverIds: serverIds ?? null,
                    strategy,
                    sourceId
                });
                res.json(result);
            } else {
                const useCase = new SyncMcpToAllToolsUseCase(syncService);
                const result = await useCase.execute({
                    strategy,
                    sourceId
                });
                res.json(result);
            }
        } catch (error) {
            console.error('Error syncing MCP:', error);
            res.status(500).json({ error: 'Failed to sync MCP' });
        }
    }

    private async syncMcpToTool(req: Request, res: Response): Promise<void> {
        try {
            console.log(`[API] MCP sync requested:`, req.body);
            const { toolId, strategy, serverNames, sourceId, global, targetPath } = req.body;

            if (!toolId) {
                res.status(400).json({ success: false, message: 'Tool ID is required' });
                return;
            }

            const configPath = await this.resolveConfigPath(toolId, global, targetPath);
            if (!configPath) {
                res.status(400).json({ success: false, message: `Could not resolve config path for tool: ${toolId}` });
                return;
            }

            const result = await new SyncMcpToToolUseCase(syncService).execute({
                toolId,
                strategy,
                configPath,
                serverIds: serverNames || [],
                sourceId
            });

            if (result.success) {
                res.json(result);
            } else {
                res.status(500).json(result);
            }
        } catch (error: any) {
            console.error(`[API] Failed to sync MCP:`, error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    private async resolveConfigPath(toolId: string, global?: boolean, targetPath?: string, providedPath?: string): Promise<string | null> {
        if (providedPath) return providedPath;

        const { getToolMetadata } = await import('@align-agents/cli');
        const meta = getToolMetadata(toolId);
        if (!meta) return null;

        // Default to global if undefined
        const isGlobal = global !== false;

        if (isGlobal) {
            return meta.mcpConfigPath || meta.configPaths?.[0] || null;
        } else {
            // Project mode
            if (!targetPath) return null;
            if (!meta.projectMcpConfigFilename) {
                console.warn(`[API] Tool ${toolId} does not support project-level MCP config.`);
                return null;
            }

            const path = await import('path');
            return path.join(targetPath, meta.projectMcpConfigFilename);
        }
    }

    // MCP Definitions Management
    async getDefinitions(req: Request, res: Response) {
        try {
            const definitions = await mcpService.getMcpDefinitions();
            res.json(definitions);
        } catch (error) {
            console.error('Error getting MCP definitions:', error);
            res.status(500).json({ error: 'Failed to get MCP definitions' });
        }
    }

    async createDefinition(req: Request, res: Response) {
        try {
            const { name, command, args, description, env } = req.body;
            if (!name || !command || !args) {
                return res.status(400).json({ error: 'Name, command, and args are required' });
            }
            const definition = await mcpService.createMcpDefinition({ name, command, args, description, env });
            res.json(definition);
        } catch (error) {
            console.error('Error creating MCP definition:', error);
            res.status(500).json({ error: 'Failed to create MCP definition' });
        }
    }

    async updateDefinition(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const definition = await mcpService.updateMcpDefinition(id, updates);
            res.json(definition);
        } catch (error: any) {
            console.error('Error updating MCP definition:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'MCP definition not found' });
            }
            res.status(500).json({ error: 'Failed to update MCP definition' });
        }
    }

    async deleteDefinition(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await mcpService.deleteMcpDefinition(id);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting MCP definition:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'MCP definition not found' });
            }
            res.status(500).json({ error: 'Failed to delete MCP definition' });
        }
    }

    // MCP Sets Management
    async getSets(req: Request, res: Response) {
        try {
            const sets = await mcpService.getMcpSets();
            res.json(sets);
        } catch (error) {
            console.error('Error getting MCP sets:', error);
            res.status(500).json({ error: 'Failed to get MCP sets' });
        }
    }

    async createSet(req: Request, res: Response) {
        try {
            const { name, items, description } = req.body;
            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }
            const set = await mcpService.createMcpSet(name, items || [], description);
            res.json(set);
        } catch (error) {
            console.error('Error creating MCP set:', error);
            res.status(500).json({ error: 'Failed to create MCP set' });
        }
    }

    async updateSet(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const set = await mcpService.updateMcpSet(id, updates);
            res.json(set);
        } catch (error: any) {
            console.error('Error updating MCP set:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'MCP set not found' });
            }
            res.status(500).json({ error: 'Failed to update MCP set' });
        }
    }

    async deleteSet(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await mcpService.deleteMcpSet(id);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting MCP set:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'MCP set not found' });
            }
            if (error.message.includes('active')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to delete MCP set' });
        }
    }

    async setActiveSet(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await mcpService.setActiveMcpSet(id);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error setting active MCP set:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'MCP set not found' });
            }
            res.status(500).json({ error: 'Failed to set active MCP set' });
        }
    }
}
