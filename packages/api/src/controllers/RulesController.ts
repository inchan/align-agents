import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { rulesService } from '../container.js';
import {
    SyncRulesToToolUseCase,
    SyncRulesToAllToolsUseCase
} from '@align-agents/cli';

/**
 * Rules(에이전트 규칙) 동기화 및 관리 컨트롤러
 */
export class RulesController {
    /**
     * Rule을 도구에 동기화한다.
     * toolId가 있으면 특정 도구에, 없으면 모든 도구에 동기화.
     * @param req - Express Request
     *   - body.sourceId: Rule ID (필수)
     *   - body.toolId?: 대상 도구 ID
     *   - body.strategy?: 동기화 전략 ('overwrite' | 'smart-update')
     *   - body.global?: 전역 규칙 여부 (기본: true)
     *   - body.targetPath?: 프로젝트 경로
     * @param res - Express Response
     * @returns 동기화 결과
     * @throws 400 - sourceId 누락
     * @throws 500 - 동기화 실패
     */
    async sync(req: Request, res: Response) {
        try {
            const { toolId, strategy, targetPath, global, sourceId } = req.body;

            // global이 명시되지 않으면 true (전역 룰 사용)
            const shouldUseGlobal = global !== undefined ? global : true;

            console.log(`[API] Rules sync requested:`, req.body);
            console.log(`[API] shouldUseGlobal:`, shouldUseGlobal);
            console.log(`[API] Strategy received: '${strategy}' (type: ${typeof strategy})`);

            if (!sourceId) {
                return res.status(400).json({ error: 'Source ID(Rule ID) is required for sync.' });
            }

            if (!toolId) {
                // If toolId is not provided, sync to all tools
                const useCase = new SyncRulesToAllToolsUseCase(rulesService);
                const result = await useCase.execute({
                    targetPath: targetPath || process.cwd(),
                    strategy,
                    sourceId
                });
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(500).json(result);
                }
            } else {
                // If toolId is provided, sync to a specific tool
                const useCase = new SyncRulesToToolUseCase(rulesService);
                const result = await useCase.execute({
                    toolId,
                    targetPath: targetPath || process.cwd(),
                    strategy,
                    global: shouldUseGlobal,
                    sourceId
                });
                if (result.success) {
                    res.json(result);
                } else {
                    res.status(500).json(result);
                }
            }
        } catch (error: any) {
            console.error(`[API] Failed to sync rules:`, error);
            res.status(500).json({ success: false, message: error.message });
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Multi-rules management API
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * 등록된 모든 Rule 목록을 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns Rule 배열
     * @throws 500 - 조회 실패
     */
    async getRulesList(req: Request, res: Response) {
        try {
            const rules = await rulesService.getRulesList();
            res.json(rules);
        } catch (error) {
            console.error('Error getting rules list:', error);
            res.status(500).json({ error: 'Failed to get rules list' });
        }
    }

    /**
     * 새 Rule을 생성한다.
     * @param req - Express Request (body: { name, content })
     * @param res - Express Response
     * @returns 생성된 Rule
     * @throws 400 - name 또는 content 누락
     * @throws 500 - 생성 실패
     */
    async createRule(req: Request, res: Response) {
        try {
            const { name, content } = req.body;
            if (!name || content === undefined) {
                return res.status(400).json({ error: 'Name and content are required' });
            }
            const rule = await rulesService.createRule(name, content);
            res.json(rule);
        } catch (error) {
            console.error('Error creating rule:', error);
            res.status(500).json({ error: 'Failed to create rule' });
        }
    }

    /**
     * Rule 내용을 수정한다.
     * @param req - Express Request (params.id: Rule ID, body: { content, name? })
     * @param res - Express Response
     * @returns 수정된 Rule
     * @throws 400 - content 누락
     * @throws 404 - Rule 없음
     * @throws 500 - 수정 실패
     */
    async updateRule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { content, name } = req.body;
            if (content === undefined) {
                return res.status(400).json({ error: 'Content is required' });
            }
            const rule = await rulesService.updateRule(id, content, name);
            res.json(rule);
        } catch (error: any) {
            console.error('Error updating rule:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Rule not found' });
            }
            res.status(500).json({ error: 'Failed to update rule' });
        }
    }

    /**
     * Rule을 삭제한다.
     * @param req - Express Request (params.id: Rule ID)
     * @param res - Express Response
     * @returns { success: true }
     * @throws 400 - 활성 상태인 Rule 삭제 시도
     * @throws 404 - Rule 없음
     * @throws 500 - 삭제 실패
     */
    async deleteRule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await rulesService.deleteRule(id);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting rule:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Rule not found' });
            }
            if (error.message.includes('active rule')) {
                return res.status(400).json({ error: error.message });
            }
            res.status(500).json({ error: 'Failed to delete rule' });
        }
    }

}
