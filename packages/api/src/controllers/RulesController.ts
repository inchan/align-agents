import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import { rulesService } from '../container.js';
import {
    SyncRulesToToolUseCase,
    SyncRulesToAllToolsUseCase
} from '@align-agents/cli';

export class RulesController {
    // Master rules methods removed

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



    // Multi-rules management API

    async getRulesList(req: Request, res: Response) {
        try {
            const rules = await rulesService.getRulesList();
            res.json(rules);
        } catch (error) {
            console.error('Error getting rules list:', error);
            res.status(500).json({ error: 'Failed to get rules list' });
        }
    }

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

    async setActiveRule(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await rulesService.setActiveRule(id);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error setting active rule:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Rule not found' });
            }
            res.status(500).json({ error: 'Failed to set active rule' });
        }
    }
}
