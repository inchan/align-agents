import { describe, expect, it, vi, beforeEach } from 'vitest';
import { RulesController } from '../controllers/RulesController.js';
import { ToolsController } from '../controllers/ToolsController.js';
import { McpController } from '../controllers/McpController.js';

const mocks = vi.hoisted(() => ({
    mockRulesService: {
        // Master methods removed
    },
    mockSyncService: {
        // Master methods removed
        loadSyncConfig: vi.fn(() => ({ 't1': { enabled: true, servers: null } })),
    },
    scanForToolsMock: vi.fn(async () => [
        { id: 't1', name: 'Tool 1', configPath: '/tmp/t1.json', exists: true },
    ]),
}));

vi.mock('../container.js', () => ({
    rulesService: mocks.mockRulesService,
    syncService: mocks.mockSyncService,
}));

vi.mock('@ai-cli-syncer/cli', () => ({
    // Master use cases removed
    SyncRulesToToolUseCase: class {
        execute() { return { success: true, message: 'synced tool' }; }
    },
    SyncRulesToAllToolsUseCase: class {
        execute() { return { success: true, message: 'synced all' }; }
    },
    SyncMcpToToolUseCase: class {
        execute() { return { success: true, syncedServers: ['s1'] }; }
    },
    SyncMcpToAllToolsUseCase: class {
        async execute() { return { success: true, count: 1 }; }
    },
    // @ts-ignore
    scanForTools: ((...args: any[]) => mocks.scanForToolsMock(...args)) as any,
    getToolMetadata: vi.fn((toolId: string) => {
        if (toolId === 't1') {
            return { configPaths: ['/tmp/t1.json'] };
        }
        return null;
    }),
}));

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

describe('API controllers', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('RulesController', () => {
        // Master rules tests removed - methods no longer exist
    });

    describe('ToolsController', () => {
        it('list returns scanned tools', async () => {
            const controller = new ToolsController();
            const res = createRes();
            await controller.list({} as any, res);
            expect(res.statusCode).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0].id).toBe('t1');
        });
    });

    describe('McpController', () => {
        // Master MCP tests removed - methods no longer exist

        it('sync single tool validates configPath', async () => {
            mocks.scanForToolsMock.mockResolvedValue([]);
            const controller = new McpController();
            const res = createRes();
            await controller.sync({ body: { toolId: 'invalid-tool' } } as any, res);
            expect(res.statusCode).toBe(400);
        });

        it('sync single tool resolves configPath and returns result', async () => {
            mocks.scanForToolsMock.mockResolvedValue([
                { id: 't1', name: 'Tool 1', configPath: '/tmp/t1.json', exists: true },
            ]);
            const controller = new McpController();
            const res = createRes();
            await controller.sync({ body: { toolId: 't1', serverIds: ['s1'], strategy: 'merge' } } as any, res);
            expect(res.statusCode).toBe(200);
            expect(res.body.syncedServers).toContain('s1');
        });

        it('sync all tools delegates to use case', async () => {
            const controller = new McpController();
            const res = createRes();
            await controller.sync({ body: { strategy: 'merge' } } as any, res);
            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
