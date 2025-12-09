import { Request, Response } from 'express';
import { syncService, mcpService } from '../container.js';
import {
    LoadMasterMcpUseCase,
    SyncMcpToToolUseCase,
    SyncMcpToAllToolsUseCase,
    scanForTools
} from '@ai-cli-syncer/cli';

export class McpController {
    async getMasterMcp(req: Request, res: Response) {
        try {
            const useCase = new LoadMasterMcpUseCase(syncService);
            const result = useCase.execute({});
            res.json(result);
        } catch (error) {
            console.error('Error loading master MCP:', error);
            res.status(500).json({ error: 'Failed to load master MCP' });
        }
    }

    async saveMasterMcp(req: Request, res: Response) {
        try {
            const config = req.body;
            if (!config || !config.mcpServers) {
                return res.status(400).json({ error: 'Invalid MCP config' });
            }
            await syncService.saveMasterMcp(config);
            res.json({ success: true });
        } catch (error) {
            console.error('Error saving master MCP:', error);
            res.status(500).json({ error: 'Failed to save master MCP' });
        }
    }

    async sync(req: Request, res: Response) {
        try {
            const { toolId, strategy, sourceId } = req.body;

            if (toolId) {
                const resolvedConfigPath = await this.resolveConfigPath(toolId, req.body.configPath);
                if (!resolvedConfigPath) {
                    return res.status(400).json({ error: 'configPath가 필요합니다.' });
                }

                const masterServers = Object.keys(syncService.loadMasterMcp().mcpServers);
                const requestedServers = Array.isArray(req.body.serverIds)
                    ? req.body.serverIds.filter((id: unknown) => typeof id === 'string')
                    : undefined;
                const serverIds = requestedServers && requestedServers.length > 0 ? requestedServers : masterServers;

                if (!serverIds.length) {
                    return res.status(400).json({ error: '동기화할 MCP 서버가 없습니다. master-mcp 설정을 먼저 추가하세요.' });
                }

                const useCase = new SyncMcpToToolUseCase(syncService);
                const result = await useCase.execute({
                    toolId,
                    configPath: resolvedConfigPath,
                    serverIds,
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
            const { toolId, strategy, serverNames, sourceId } = req.body;

            if (!toolId) {
                res.status(400).json({ success: false, message: 'Tool ID is required' });
                return;
            }

            const configPath = await this.resolveConfigPath(toolId);
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

    private async resolveConfigPath(toolId: string, providedPath?: string): Promise<string | null> {
        if (providedPath) return providedPath;

        const { getToolMetadata } = await import('@ai-cli-syncer/cli');
        const meta = getToolMetadata(toolId);
        return meta?.configPaths?.[0] || null;
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
