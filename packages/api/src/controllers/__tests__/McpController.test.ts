import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    mockMcpService: {
        getMcpDefinitions: vi.fn(),
        createMcpDefinition: vi.fn(),
        updateMcpDefinition: vi.fn(),
        deleteMcpDefinition: vi.fn(),
        getMcpSets: vi.fn(),
        createMcpSet: vi.fn(),
        updateMcpSet: vi.fn(),
        deleteMcpSet: vi.fn(),
        setActiveMcpSet: vi.fn(),
    },
    mockSyncService: {},
    mockSyncMcpToToolUseCase: {
        execute: vi.fn(),
    },
    mockSyncMcpToAllToolsUseCase: {
        execute: vi.fn(),
    },
    mockGetToolMetadata: vi.fn(),
}));

vi.mock('../../container.js', () => ({
    mcpService: mocks.mockMcpService,
    syncService: mocks.mockSyncService,
}));

vi.mock('@align-agents/cli', () => ({
    SyncMcpToToolUseCase: class {
        constructor() {}
        execute = mocks.mockSyncMcpToToolUseCase.execute;
    },
    SyncMcpToAllToolsUseCase: class {
        constructor() {}
        execute = mocks.mockSyncMcpToAllToolsUseCase.execute;
    },
    scanForTools: vi.fn(),
    getToolMetadata: mocks.mockGetToolMetadata,
}));

import { McpController } from '../McpController.js';

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

describe('McpController', () => {
    let controller: McpController;

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new McpController();
    });

    // ─────────────────────────────────────────────────────────────────────────
    // sync
    // ─────────────────────────────────────────────────────────────────────────

    describe('sync', () => {
        it('returns 400 when sourceId is missing', async () => {
            const req = { body: {} } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Source ID(MCP Set ID) is required for sync.');
        });

        it('syncs to all tools when toolId is not provided', async () => {
            mocks.mockSyncMcpToAllToolsUseCase.execute.mockResolvedValue({ success: true, count: 3 });

            const req = { body: { sourceId: 'set-1', strategy: 'overwrite' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockSyncMcpToAllToolsUseCase.execute).toHaveBeenCalledWith({
                strategy: 'overwrite',
                sourceId: 'set-1',
            });
        });

        it('syncs to specific tool when toolId is provided with global path', async () => {
            mocks.mockGetToolMetadata.mockReturnValue({
                mcpConfigPath: '/home/user/.config/claude/mcp.json',
            });
            mocks.mockSyncMcpToToolUseCase.execute.mockResolvedValue({ success: true });

            const req = {
                body: {
                    sourceId: 'set-1',
                    toolId: 'claude-code',
                    strategy: 'smart-update',
                    global: true,
                },
            } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockSyncMcpToToolUseCase.execute).toHaveBeenCalled();
        });

        it('returns 400 when config path cannot be resolved', async () => {
            mocks.mockGetToolMetadata.mockReturnValue(null);

            const req = {
                body: { sourceId: 'set-1', toolId: 'unknown-tool' },
            } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toContain('유효한 설정 경로를 찾을 수 없습니다');
        });

        it('returns 400 for project mode without targetPath', async () => {
            mocks.mockGetToolMetadata.mockReturnValue({
                projectMcpConfigFilename: '.mcp.json',
            });

            const req = {
                body: { sourceId: 'set-1', toolId: 'claude-code', global: false },
            } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(400);
        });

        it('uses provided configPath if available', async () => {
            mocks.mockSyncMcpToToolUseCase.execute.mockResolvedValue({ success: true });

            const req = {
                body: {
                    sourceId: 'set-1',
                    toolId: 'claude-code',
                    configPath: '/custom/path/mcp.json',
                },
            } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(200);
            expect(mocks.mockSyncMcpToToolUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({ configPath: '/custom/path/mcp.json' })
            );
        });

        it('filters serverIds to only strings', async () => {
            mocks.mockGetToolMetadata.mockReturnValue({
                mcpConfigPath: '/config/mcp.json',
            });
            mocks.mockSyncMcpToToolUseCase.execute.mockResolvedValue({ success: true });

            const req = {
                body: {
                    sourceId: 'set-1',
                    toolId: 'claude-code',
                    serverIds: ['server1', 123, 'server2', null],
                },
            } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(mocks.mockSyncMcpToToolUseCase.execute).toHaveBeenCalledWith(
                expect.objectContaining({ serverIds: ['server1', 'server2'] })
            );
        });

        it('returns 500 on sync error', async () => {
            mocks.mockSyncMcpToAllToolsUseCase.execute.mockRejectedValue(new Error('Sync failed'));

            const req = { body: { sourceId: 'set-1' } } as any;
            const res = createRes();

            await controller.sync(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to sync MCP');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Definitions
    // ─────────────────────────────────────────────────────────────────────────

    describe('getDefinitions', () => {
        it('returns list of definitions', async () => {
            const definitions = [
                { id: 'd1', name: 'Server 1', command: 'node', args: ['server.js'] },
                { id: 'd2', name: 'Server 2', command: 'python', args: ['server.py'] },
            ];
            mocks.mockMcpService.getMcpDefinitions.mockResolvedValue(definitions);

            const res = createRes();
            await controller.getDefinitions({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(definitions);
        });

        it('returns 500 on error', async () => {
            mocks.mockMcpService.getMcpDefinitions.mockRejectedValue(new Error('DB error'));

            const res = createRes();
            await controller.getDefinitions({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get MCP definitions');
        });
    });

    describe('createDefinition', () => {
        it('returns 400 when name is missing', async () => {
            const req = { body: { command: 'node' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Name is required');
        });

        it('returns 400 when command is missing for stdio type', async () => {
            const req = { body: { name: 'My Server' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Command is required for stdio type MCP servers');
        });

        it('creates stdio definition successfully', async () => {
            const definition = { id: 'd1', name: 'Server', command: 'node', args: ['server.js'] };
            mocks.mockMcpService.createMcpDefinition.mockResolvedValue(definition);

            const req = { body: { name: 'Server', command: 'node', args: ['server.js'] } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(definition);
            expect(mocks.mockMcpService.createMcpDefinition).toHaveBeenCalledWith({
                name: 'Server',
                command: 'node',
                args: ['server.js'],
                description: undefined,
                env: undefined,
            });
        });

        it('creates http definition successfully', async () => {
            const definition = { id: 'd1', name: 'HTTP Server', type: 'http', url: 'http://localhost:3000' };
            mocks.mockMcpService.createMcpDefinition.mockResolvedValue(definition);

            const req = { body: { name: 'HTTP Server', type: 'http', url: 'http://localhost:3000' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(definition);
        });

        it('returns 400 when url is missing for http type', async () => {
            const req = { body: { name: 'HTTP Server', type: 'http' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('URL is required for HTTP/SSE type MCP servers');
        });

        it('returns 400 for invalid url format', async () => {
            const req = { body: { name: 'HTTP Server', type: 'http', url: 'invalid-url' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Invalid URL format');
        });

        it('infers http type when url is provided without command', async () => {
            const definition = { id: 'd1', name: 'Server', type: 'http', url: 'http://localhost:3000' };
            mocks.mockMcpService.createMcpDefinition.mockResolvedValue(definition);

            const req = { body: { name: 'Server', url: 'http://localhost:3000' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(200);
            expect(mocks.mockMcpService.createMcpDefinition).toHaveBeenCalledWith(
                expect.objectContaining({ type: 'http', url: 'http://localhost:3000' })
            );
        });

        it('returns 500 on creation error', async () => {
            mocks.mockMcpService.createMcpDefinition.mockRejectedValue(new Error('Create failed'));

            const req = { body: { name: 'Server', command: 'node' } } as any;
            const res = createRes();

            await controller.createDefinition(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to create MCP definition');
        });
    });

    describe('updateDefinition', () => {
        it('updates definition successfully', async () => {
            const definition = { id: 'd1', name: 'Updated', command: 'node' };
            mocks.mockMcpService.updateMcpDefinition.mockResolvedValue(definition);

            const req = { params: { id: 'd1' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateDefinition(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(definition);
        });

        it('returns 404 when definition not found', async () => {
            mocks.mockMcpService.updateMcpDefinition.mockRejectedValue(new Error('Definition not found'));

            const req = { params: { id: 'nonexistent' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateDefinition(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('MCP definition not found');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockMcpService.updateMcpDefinition.mockRejectedValue(new Error('DB error'));

            const req = { params: { id: 'd1' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateDefinition(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to update MCP definition');
        });
    });

    describe('deleteDefinition', () => {
        it('deletes definition successfully', async () => {
            mocks.mockMcpService.deleteMcpDefinition.mockResolvedValue(undefined);

            const req = { params: { id: 'd1' } } as any;
            const res = createRes();

            await controller.deleteDefinition(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 404 when definition not found', async () => {
            mocks.mockMcpService.deleteMcpDefinition.mockRejectedValue(new Error('Definition not found'));

            const req = { params: { id: 'nonexistent' } } as any;
            const res = createRes();

            await controller.deleteDefinition(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('MCP definition not found');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockMcpService.deleteMcpDefinition.mockRejectedValue(new Error('DB error'));

            const req = { params: { id: 'd1' } } as any;
            const res = createRes();

            await controller.deleteDefinition(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to delete MCP definition');
        });
    });

    // ─────────────────────────────────────────────────────────────────────────
    // Sets
    // ─────────────────────────────────────────────────────────────────────────

    describe('getSets', () => {
        it('returns list of sets', async () => {
            const sets = [
                { id: 's1', name: 'Development', items: ['d1', 'd2'] },
                { id: 's2', name: 'Production', items: ['d3'] },
            ];
            mocks.mockMcpService.getMcpSets.mockResolvedValue(sets);

            const res = createRes();
            await controller.getSets({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(sets);
        });

        it('returns 500 on error', async () => {
            mocks.mockMcpService.getMcpSets.mockRejectedValue(new Error('DB error'));

            const res = createRes();
            await controller.getSets({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get MCP sets');
        });
    });

    describe('createSet', () => {
        it('returns 400 when name is missing', async () => {
            const req = { body: { items: ['d1'] } } as any;
            const res = createRes();

            await controller.createSet(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Name is required');
        });

        it('creates set successfully', async () => {
            const set = { id: 's1', name: 'Dev Set', items: ['d1', 'd2'] };
            mocks.mockMcpService.createMcpSet.mockResolvedValue(set);

            const req = { body: { name: 'Dev Set', items: ['d1', 'd2'], description: 'Development set' } } as any;
            const res = createRes();

            await controller.createSet(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(set);
            expect(mocks.mockMcpService.createMcpSet).toHaveBeenCalledWith('Dev Set', ['d1', 'd2'], 'Development set');
        });

        it('creates set with empty items by default', async () => {
            const set = { id: 's1', name: 'Empty Set', items: [] };
            mocks.mockMcpService.createMcpSet.mockResolvedValue(set);

            const req = { body: { name: 'Empty Set' } } as any;
            const res = createRes();

            await controller.createSet(req, res);

            expect(mocks.mockMcpService.createMcpSet).toHaveBeenCalledWith('Empty Set', [], undefined);
        });

        it('returns 500 on creation error', async () => {
            mocks.mockMcpService.createMcpSet.mockRejectedValue(new Error('Create failed'));

            const req = { body: { name: 'Set' } } as any;
            const res = createRes();

            await controller.createSet(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to create MCP set');
        });
    });

    describe('updateSet', () => {
        it('updates set successfully', async () => {
            const set = { id: 's1', name: 'Updated Set', items: ['d1'] };
            mocks.mockMcpService.updateMcpSet.mockResolvedValue(set);

            const req = { params: { id: 's1' }, body: { name: 'Updated Set' } } as any;
            const res = createRes();

            await controller.updateSet(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(set);
        });

        it('returns 404 when set not found', async () => {
            mocks.mockMcpService.updateMcpSet.mockRejectedValue(new Error('Set not found'));

            const req = { params: { id: 'nonexistent' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateSet(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('MCP set not found');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockMcpService.updateMcpSet.mockRejectedValue(new Error('DB error'));

            const req = { params: { id: 's1' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateSet(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to update MCP set');
        });
    });

    describe('deleteSet', () => {
        it('deletes set successfully', async () => {
            mocks.mockMcpService.deleteMcpSet.mockResolvedValue(undefined);

            const req = { params: { id: 's1' } } as any;
            const res = createRes();

            await controller.deleteSet(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });

        it('returns 404 when set not found', async () => {
            mocks.mockMcpService.deleteMcpSet.mockRejectedValue(new Error('Set not found'));

            const req = { params: { id: 'nonexistent' } } as any;
            const res = createRes();

            await controller.deleteSet(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('MCP set not found');
        });

        it('returns 400 when trying to delete active set', async () => {
            mocks.mockMcpService.deleteMcpSet.mockRejectedValue(new Error('Cannot delete active set'));

            const req = { params: { id: 's1' } } as any;
            const res = createRes();

            await controller.deleteSet(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Cannot delete active set');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockMcpService.deleteMcpSet.mockRejectedValue(new Error('DB error'));

            const req = { params: { id: 's1' } } as any;
            const res = createRes();

            await controller.deleteSet(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to delete MCP set');
        });
    });

    describe('setActiveSet', () => {
        it('sets active set successfully', async () => {
            mocks.mockMcpService.setActiveMcpSet.mockResolvedValue(undefined);

            const req = { params: { id: 's1' } } as any;
            const res = createRes();

            await controller.setActiveSet(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mocks.mockMcpService.setActiveMcpSet).toHaveBeenCalledWith('s1');
        });

        it('returns 404 when set not found', async () => {
            mocks.mockMcpService.setActiveMcpSet.mockRejectedValue(new Error('Set not found'));

            const req = { params: { id: 'nonexistent' } } as any;
            const res = createRes();

            await controller.setActiveSet(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('MCP set not found');
        });

        it('returns 500 on other errors', async () => {
            mocks.mockMcpService.setActiveMcpSet.mockRejectedValue(new Error('DB error'));

            const req = { params: { id: 's1' } } as any;
            const res = createRes();

            await controller.setActiveSet(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to set active MCP set');
        });
    });
});
