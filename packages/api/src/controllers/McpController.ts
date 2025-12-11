import { Request, Response } from 'express';
import { syncService, mcpService } from '../container.js';
import {
    SyncMcpToToolUseCase,
    SyncMcpToAllToolsUseCase,
} from '@align-agents/cli';

/**
 * MCP(Model Context Protocol) 서버 설정 동기화 및 관리 컨트롤러
 */
export class McpController {
    /**
     * MCP 설정을 도구에 동기화한다.
     * toolId가 있으면 특정 도구에, 없으면 모든 도구에 동기화.
     * @param req - Express Request
     *   - body.sourceId: MCP Set ID (필수)
     *   - body.toolId?: 대상 도구 ID
     *   - body.strategy?: 동기화 전략 ('overwrite' | 'smart-update')
     *   - body.global?: 전역 설정 여부
     *   - body.targetPath?: 프로젝트 경로
     *   - body.serverIds?: 동기화할 서버 ID 배열
     * @param res - Express Response
     * @returns 동기화 결과
     * @throws 400 - sourceId 누락 또는 설정 경로 해석 실패
     * @throws 500 - 동기화 실패
     */
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

    /**
     * 도구의 MCP 설정 파일 경로를 결정한다.
     * @param toolId - 도구 ID
     * @param global - 전역 설정 여부 (기본: true)
     * @param targetPath - 프로젝트 경로 (프로젝트 모드 시 필수)
     * @param providedPath - 직접 지정된 경로 (있으면 우선 사용)
     * @returns 설정 파일 경로 또는 null
     */
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

    // ─────────────────────────────────────────────────────────────────────────
    // MCP Definitions Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * 모든 MCP Definition 목록을 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns MCP Definition 배열
     * @throws 500 - 조회 실패
     */
    async getDefinitions(req: Request, res: Response) {
        try {
            const definitions = await mcpService.getMcpDefinitions();
            res.json(definitions);
        } catch (error) {
            console.error('Error getting MCP definitions:', error);
            res.status(500).json({ error: 'Failed to get MCP definitions' });
        }
    }

    /**
     * 새 MCP Definition을 생성한다.
     * @param req - Express Request (body: { name, command?, args?, type?, url?, description?, env? })
     * @param res - Express Response
     * @returns 생성된 MCP Definition
     * @throws 400 - 필수 필드 누락 (stdio: name, command, args / http: name, url)
     * @throws 500 - 생성 실패
     */
    async createDefinition(req: Request, res: Response) {
        try {
            const { name, command, args, type, url, description, env } = req.body;

            // Validate based on server type
            const isHttpType = type === 'http' || type === 'sse' || (url && !command);

            if (!name) {
                return res.status(400).json({ error: 'Name is required' });
            }

            if (isHttpType) {
                // HTTP/SSE type validation
                if (!url) {
                    return res.status(400).json({ error: 'URL is required for HTTP/SSE type MCP servers' });
                }
                // Validate URL format
                try {
                    new URL(url);
                } catch {
                    return res.status(400).json({ error: 'Invalid URL format' });
                }
                const definition = await mcpService.createMcpDefinition({
                    name,
                    type: type || 'http',
                    url,
                    description,
                    env
                });
                res.json(definition);
            } else {
                // stdio type validation (default)
                if (!command) {
                    return res.status(400).json({ error: 'Command is required for stdio type MCP servers' });
                }
                const definition = await mcpService.createMcpDefinition({ name, command, args: args || [], description, env });
                res.json(definition);
            }
        } catch (error) {
            console.error('Error creating MCP definition:', error);
            res.status(500).json({ error: 'Failed to create MCP definition' });
        }
    }

    /**
     * MCP Definition을 수정한다.
     * @param req - Express Request (params.id: Definition ID, body: 수정할 필드)
     * @param res - Express Response
     * @returns 수정된 MCP Definition
     * @throws 404 - Definition 없음
     * @throws 500 - 수정 실패
     */
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

    /**
     * MCP Definition을 삭제한다.
     * @param req - Express Request (params.id: Definition ID)
     * @param res - Express Response
     * @returns { success: true }
     * @throws 404 - Definition 없음
     * @throws 500 - 삭제 실패
     */
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

    // ─────────────────────────────────────────────────────────────────────────
    // MCP Sets Management
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * 모든 MCP Set 목록을 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns MCP Set 배열
     * @throws 500 - 조회 실패
     */
    async getSets(req: Request, res: Response) {
        try {
            const sets = await mcpService.getMcpSets();
            res.json(sets);
        } catch (error) {
            console.error('Error getting MCP sets:', error);
            res.status(500).json({ error: 'Failed to get MCP sets' });
        }
    }

    /**
     * 새 MCP Set을 생성한다.
     * @param req - Express Request (body: { name, items?, description? })
     * @param res - Express Response
     * @returns 생성된 MCP Set
     * @throws 400 - name 누락
     * @throws 500 - 생성 실패
     */
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

    /**
     * MCP Set을 수정한다.
     * @param req - Express Request (params.id: Set ID, body: 수정할 필드)
     * @param res - Express Response
     * @returns 수정된 MCP Set
     * @throws 404 - Set 없음
     * @throws 500 - 수정 실패
     */
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

    /**
     * MCP Set을 삭제한다.
     * @param req - Express Request (params.id: Set ID)
     * @param res - Express Response
     * @returns { success: true }
     * @throws 400 - 활성 상태인 Set 삭제 시도
     * @throws 404 - Set 없음
     * @throws 500 - 삭제 실패
     */
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

    /**
     * 특정 MCP Set을 활성 상태로 설정한다.
     * @param req - Express Request (params.id: Set ID)
     * @param res - Express Response
     * @returns { success: true }
     * @throws 404 - Set 없음
     * @throws 500 - 설정 실패
     */
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
