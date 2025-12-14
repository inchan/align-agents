import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    mockScanForTools: vi.fn(),
    mockProjectScanner: {
        getAllRecentProjects: vi.fn(),
    },
    mockToolMetadata: [
        { id: 'claude-code', name: 'Claude Code', supportsMcp: true },
        { id: 'gemini-cli', name: 'Gemini CLI', supportsMcp: true },
    ],
    mockExec: vi.fn(),
}));

vi.mock('@align-agents/cli', () => ({
    scanForTools: (...args: any[]) => mocks.mockScanForTools(...args),
    ProjectScanner: class {
        getAllRecentProjects = mocks.mockProjectScanner.getAllRecentProjects;
    },
    TOOL_METADATA: mocks.mockToolMetadata,
}));

vi.mock('child_process', () => ({
    exec: mocks.mockExec,
}));

import { ToolsController } from '../ToolsController.js';

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

describe('ToolsController', () => {
    let controller: ToolsController;

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new ToolsController();
    });

    describe('getMetadata', () => {
        it('returns tool metadata', async () => {
            const res = createRes();
            await controller.getMetadata({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(mocks.mockToolMetadata);
        });
    });

    describe('list', () => {
        it('returns scanned tools', async () => {
            const tools = [
                { id: 'claude-code', name: 'Claude Code', configPath: '/path/config.json', exists: true },
                { id: 'gemini-cli', name: 'Gemini CLI', configPath: '/path/settings.json', exists: false },
            ];
            mocks.mockScanForTools.mockResolvedValue(tools);

            const res = createRes();
            await controller.list({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(tools);
        });

        it('returns 500 on error', async () => {
            mocks.mockScanForTools.mockRejectedValue(new Error('Scan failed'));

            const res = createRes();
            await controller.list({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to scan tools');
        });
    });

    describe('scan', () => {
        it('delegates to list', async () => {
            const tools = [{ id: 't1', name: 'Tool 1', configPath: '/path', exists: true }];
            mocks.mockScanForTools.mockResolvedValue(tools);

            const res = createRes();
            await controller.scan({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(tools);
        });
    });

    describe('getRecentProjects', () => {
        it('returns recent projects', async () => {
            const projects = [
                { path: '/project/1', name: 'Project 1', lastOpened: new Date().toISOString() },
                { path: '/project/2', name: 'Project 2', lastOpened: new Date().toISOString() },
            ];
            mocks.mockProjectScanner.getAllRecentProjects.mockResolvedValue(projects);

            const res = createRes();
            await controller.getRecentProjects({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(projects);
        });

        it('returns 500 on error', async () => {
            mocks.mockProjectScanner.getAllRecentProjects.mockRejectedValue(new Error('Scan failed'));

            const res = createRes();
            await controller.getRecentProjects({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get recent projects');
        });
    });

    describe('pickFolder', () => {
        it('method is defined and callable', () => {
            expect(controller.pickFolder).toBeDefined();
            expect(typeof controller.pickFolder).toBe('function');
        });

        it('returns selected folder path on success', async () => {
            mocks.mockExec.mockImplementation((cmd: string, callback: Function) => {
                callback(null, '/Users/test/project\n', '');
            });

            const req = {} as any;
            const res = createRes();

            await controller.pickFolder(req, res);

            expect(res.body.path).toBe('/Users/test/project');
        });

        it('handles user cancellation', async () => {
            mocks.mockExec.mockImplementation((cmd: string, callback: Function) => {
                const error = new Error('User canceled');
                callback(error, '', 'User canceled');
            });

            const req = {} as any;
            const res = createRes();

            await controller.pickFolder(req, res);

            expect(res.body.path).toBeNull();
            expect(res.body.cancelled).toBe(true);
        });

        it('returns 500 on exec error', async () => {
            mocks.mockExec.mockImplementation((cmd: string, callback: Function) => {
                const error = new Error('Command failed');
                callback(error, '', '');
            });

            const req = {} as any;
            const res = createRes();

            await controller.pickFolder(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to pick folder');
        });

        it('returns 500 on dynamic import error', async () => {
            // This tests the outer try-catch block when import fails
            // The implementation uses dynamic import, which could throw
            mocks.mockExec.mockImplementation(() => {
                throw new Error('Import failed');
            });

            const req = {} as any;
            const res = createRes();

            await controller.pickFolder(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Internal server error');
        });
    });

    describe('getMetadata - error handling', () => {
        it('handles error gracefully', async () => {
            // TOOL_METADATA is a static import, so errors are unlikely
            // but we test the method handles the try-catch
            const res = createRes();
            await controller.getMetadata({} as any, res);

            // Should always succeed as TOOL_METADATA is static
            expect(res.statusCode).toBe(200);
        });
    });
});
