import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    mockRulesService: {
        getRulesList: vi.fn(),
        createRule: vi.fn(),
        updateRule: vi.fn(),
        deleteRule: vi.fn(),
        setActiveRule: vi.fn(),
    },
    mockSyncRulesToToolUseCase: {
        execute: vi.fn(),
    },
    mockSyncRulesToAllToolsUseCase: {
        execute: vi.fn(),
    },
}));

vi.mock('../../container.js', () => ({
    rulesService: mocks.mockRulesService,
}));

vi.mock('@align-agents/cli', () => ({
    NodeFileSystem: class {},
    RulesService: class {},
    SyncService: class {},
    HistoryService: class {},
    McpService: class {},
    SyncRulesToToolUseCase: class {
        constructor() {}
        execute = mocks.mockSyncRulesToToolUseCase.execute;
    },
    SyncRulesToAllToolsUseCase: class {
        constructor() {}
        execute = mocks.mockSyncRulesToAllToolsUseCase.execute;
    },
}));

import { RulesController } from '../RulesController.js';

function createRes() {
    const res: any = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.body = payload;
            return this;
        },
    };
    return res;
}

describe('RulesController', () => {
    let controller: RulesController;

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new RulesController();
    });

    describe('sync', () => {
        it('returns 400 when sourceId is missing', async () => {
            const req = { body: {} } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Source ID(Rule ID) is required for sync.');
        });

        it('syncs to all tools when toolId is not provided', async () => {
            mocks.mockSyncRulesToAllToolsUseCase.execute.mockResolvedValue({ success: true, count: 3 });

            const req = { body: { sourceId: 'rule-1', strategy: 'overwrite' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockSyncRulesToAllToolsUseCase.execute).toHaveBeenCalled();
        });

        it('syncs to specific tool when toolId is provided', async () => {
            mocks.mockSyncRulesToToolUseCase.execute.mockResolvedValue({ success: true, message: 'synced' });

            const req = { body: { sourceId: 'rule-1', toolId: 'claude-code', strategy: 'smart-update' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockSyncRulesToToolUseCase.execute).toHaveBeenCalled();
        });

        it('returns 500 when sync fails', async () => {
            mocks.mockSyncRulesToAllToolsUseCase.execute.mockResolvedValue({ success: false, message: 'Sync failed' });

            const req = { body: { sourceId: 'rule-1' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.success).toBe(false);
        });

        it('returns 500 on exception', async () => {
            mocks.mockSyncRulesToAllToolsUseCase.execute.mockRejectedValue(new Error('Unexpected error'));

            const req = { body: { sourceId: 'rule-1' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.message).toBe('Unexpected error');
        });

        it('uses default global=true when not specified', async () => {
            mocks.mockSyncRulesToToolUseCase.execute.mockResolvedValue({ success: true });

            const req = { body: { sourceId: 'rule-1', toolId: 'claude-code' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(mocks.mockSyncRulesToToolUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({ global: true })
            );
        });

        it('respects explicit global=false', async () => {
            mocks.mockSyncRulesToToolUseCase.execute.mockResolvedValue({ success: true });

            const req = { body: { sourceId: 'rule-1', toolId: 'claude-code', global: false, targetPath: '/project' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(mocks.mockSyncRulesToToolUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({ global: false, targetPath: '/project' })
            );
        });
    });

    describe('getRulesList', () => {
        it('returns list of rules', async () => {
            const rules = [
                { id: 'r1', name: 'Rule 1', content: 'content1' },
                { id: 'r2', name: 'Rule 2', content: 'content2' },
            ];
            mocks.mockRulesService.getRulesList.mockResolvedValue(rules);

            const res = createRes();
            await controller.getRulesList({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(rules);
        });

        it('returns 500 on error', async () => {
            mocks.mockRulesService.getRulesList.mockRejectedValue(new Error('Read error'));

            const res = createRes();
            await controller.getRulesList({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get rules list');
        });
    });

    describe('createRule', () => {
        it('returns 400 when name is missing', async () => {
            const req = { body: { content: 'some content' } } as any;
            const res = createRes();

            await controller.createRule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Name and content are required');
        });

        it('returns 400 when content is undefined', async () => {
            const req = { body: { name: 'My Rule' } } as any;
            const res = createRes();

            await controller.createRule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Name and content are required');
        });

        it('creates rule successfully', async () => {
            const rule = { id: 'r1', name: 'My Rule', content: 'content' };
            mocks.mockRulesService.createRule.mockResolvedValue(rule);

            const req = { body: { name: 'My Rule', content: 'content' } } as any;
            const res = createRes();

            await controller.createRule(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(rule);
            expect(mocks.mockRulesService.createRule).toHaveBeenCalledWith('My Rule', 'content');
        });

        it('returns 500 on error', async () => {
            mocks.mockRulesService.createRule.mockRejectedValue(new Error('Create failed'));

            const req = { body: { name: 'My Rule', content: 'content' } } as any;
            const res = createRes();

            await controller.createRule(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to create rule');
        });
    });

    describe('updateRule', () => {
        it('returns 400 when content is undefined', async () => {
            const req = { params: { id: 'r1' }, body: { name: 'New Name' } } as any;
            const res = createRes();

            await controller.updateRule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Content is required');
        });

        it('updates rule successfully', async () => {
            const rule = { id: 'r1', name: 'Updated', content: 'new content' };
            mocks.mockRulesService.updateRule.mockResolvedValue(rule);

            const req = { params: { id: 'r1' }, body: { content: 'new content', name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateRule(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(rule);
            expect(mocks.mockRulesService.updateRule).toHaveBeenCalledWith('r1', 'new content', 'Updated');
        });

        it('returns 404 when rule not found', async () => {
            mocks.mockRulesService.updateRule.mockRejectedValue(new Error('Rule not found'));

            const req = { params: { id: 'nonexistent' }, body: { content: 'content' } } as any;
            const res = createRes();

            await controller.updateRule(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Rule not found');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockRulesService.updateRule.mockRejectedValue(new Error('Database error'));

            const req = { params: { id: 'r1' }, body: { content: 'content' } } as any;
            const res = createRes();

            await controller.updateRule(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to update rule');
        });
    });

    describe('deleteRule', () => {
        it('deletes rule successfully', async () => {
            mocks.mockRulesService.deleteRule.mockResolvedValue(undefined);

            const req = { params: { id: 'r1' } } as any;
            const res = createRes();

            await controller.deleteRule(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockRulesService.deleteRule).toHaveBeenCalledWith('r1');
        });

        it('returns 404 when rule not found', async () => {
            mocks.mockRulesService.deleteRule.mockRejectedValue(new Error('Rule not found'));

            const req = { params: { id: 'nonexistent' } } as any;
            const res = createRes();

            await controller.deleteRule(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Rule not found');
        });

        it('returns 400 when trying to delete active rule', async () => {
            mocks.mockRulesService.deleteRule.mockRejectedValue(new Error('Cannot delete active rule'));

            const req = { params: { id: 'r1' } } as any;
            const res = createRes();

            await controller.deleteRule(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Cannot delete active rule');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockRulesService.deleteRule.mockRejectedValue(new Error('Database error'));

            const req = { params: { id: 'r1' } } as any;
            const res = createRes();

            await controller.deleteRule(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to delete rule');
        });
    });

    describe('setActiveRule', () => {
        it('sets active rule successfully', async () => {
            mocks.mockRulesService.setActiveRule.mockResolvedValue(undefined);

            const req = { params: { id: 'r1' } } as any;
            const res = createRes();

            await controller.setActiveRule(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockRulesService.setActiveRule).toHaveBeenCalledWith('r1');
        });

        it('returns 404 when rule not found', async () => {
            mocks.mockRulesService.setActiveRule.mockRejectedValue(new Error('Rule not found'));

            const req = { params: { id: 'nonexistent' } } as any;
            const res = createRes();

            await controller.setActiveRule(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Rule not found');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockRulesService.setActiveRule.mockRejectedValue(new Error('Database error'));

            const req = { params: { id: 'r1' } } as any;
            const res = createRes();

            await controller.setActiveRule(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to set active rule');
        });
    });
});
