import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ToolRepository } from '../ToolRepository.js';
import * as ToolDefinitions from '../../constants/ToolDefinitions.js';

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    const mockExistsSync = vi.fn();
    const mockReadFileSync = vi.fn();
    const mockWriteFileSync = vi.fn();
    const mockPromisesReadFile = vi.fn();
    const mockPromisesWriteFile = vi.fn();

    return {
        ...actual,
        existsSync: mockExistsSync,
        readFileSync: mockReadFileSync,
        writeFileSync: mockWriteFileSync,
        promises: {
            ...actual.promises,
            readFile: mockPromisesReadFile,
            writeFile: mockPromisesWriteFile,
        },
        default: {
            ...actual, // or actual.default
            existsSync: mockExistsSync,
            readFileSync: mockReadFileSync,
            writeFileSync: mockWriteFileSync,
            promises: {
                ...(actual.promises || {}),
                readFile: mockPromisesReadFile,
                writeFile: mockPromisesWriteFile,
            },
        }
    };
});

vi.mock('os', () => ({
    homedir: vi.fn(() => '/mock/home'),
    default: {
        homedir: vi.fn(() => '/mock/home'),
    }
}));
const { mockToolMetadata } = vi.hoisted(() => ({ mockToolMetadata: [] as any[] }));

vi.mock('../../constants/ToolDefinitions.js', () => ({
    TOOL_METADATA: mockToolMetadata
}));

describe('ToolRepository', () => {
    const mockHomeDir = '/mock/home';
    const registryPath = path.join(mockHomeDir, '.align-agents', 'registry.json');
    let mockFsContent: string | null = null;
    let mockFsMap: Record<string, string> = {};

    beforeEach(() => {
        vi.resetAllMocks();
        mockToolMetadata.length = 0; // Clear metadata
        mockFsContent = null;
        mockFsMap = {};

        vi.mocked(os.homedir).mockReturnValue(mockHomeDir);

        // Reset singleton instance (hacky but necessary for singleton testing)
        // @ts-ignore
        ToolRepository.instance = null;

        // Setup Stateful FS Mock
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            if (p === registryPath) return mockFsContent !== null;
            return !!mockFsMap[p];
        });

        // Handle both promise and sync read/write
        const readImpl = (p: any) => {
            if (p === registryPath) {
                if (mockFsContent === null) throw new Error('File not found');
                return mockFsContent;
            }
            if (mockFsMap[p]) return mockFsMap[p];
            throw new Error('File not found');
        };

        const writeImpl = (p: any, data: any) => {
            if (p === registryPath) {
                mockFsContent = data as string;
            } else {
                mockFsMap[p] = data as string;
            }
        };

        vi.mocked(fs.readFileSync).mockImplementation(readImpl as any);
        vi.mocked(fs.promises.readFile).mockImplementation(async (p) => readImpl(p));

        vi.mocked(fs.writeFileSync).mockImplementation(writeImpl);
        vi.mocked(fs.promises.writeFile).mockImplementation(async (p, d) => writeImpl(p, d));
    });

    it('should maintain singleton instance', () => {
        const instance1 = ToolRepository.getInstance();
        const instance2 = ToolRepository.getInstance();
        expect(instance1).toBe(instance2);
    });

    describe('load', () => {
        it('should load registry from file if exists', async () => {
            const mockRegistry = {
                tools: [
                    { id: 't1', name: 'Tool 1', configPath: '/path/t1', exists: true }
                ]
            };

            mockFsContent = JSON.stringify(mockRegistry);

            const repo = ToolRepository.getInstance();
            await repo.load();

            expect(repo.getTools()).toHaveLength(1);
            expect(repo.getTool('t1')).toBeDefined();
        });

        it('should initialize empty registry if file does not exist', async () => {
            vi.mocked(fs.existsSync).mockReturnValue(false);

            const repo = ToolRepository.getInstance();
            await repo.load();

            expect(repo.getTools()).toEqual([]);
        });

        it('should handle load errors gracefully', async () => {
            mockFsContent = 'invalid-json'; // JSON.parse will throw
            // Or explicitly make read throw if checking specific error handling
            vi.mocked(fs.promises.readFile).mockRejectedValueOnce(new Error('Read error'));

            const repo = ToolRepository.getInstance();
            await repo.load();

            expect(repo.getTools()).toEqual([]);
        });
    });

    describe('scanAndRegisterTools (via load)', () => {
        it('should detect new tools from metadata', async () => {
            mockFsMap['/applications/app.json'] = '{}';

            // Mock metadata
            mockToolMetadata.push({ id: 'new-tool', name: 'New Tool', configPaths: ['/applications/app.json'] });

            const repo = ToolRepository.getInstance();
            await repo.load();

            const tools = repo.getTools();
            expect(tools).toHaveLength(1);
            expect(tools[0].id).toBe('new-tool');
            expect(tools[0].exists).toBe(true);
            expect(tools[0].configPath).toBe('/applications/app.json');
        });

        it('should update existing tools status', async () => {
            const mockRegistry = {
                tools: [
                    { id: 'existing-tool', name: 'Existing', configPath: '/old/path', exists: false }
                ]
            };

            mockFsMap['/new/path'] = '{}';
            mockFsContent = JSON.stringify(mockRegistry);

            mockToolMetadata.push({ id: 'existing-tool', name: 'Existing', configPaths: ['/new/path'] });

            const repo = ToolRepository.getInstance();
            await repo.load();

            const tool = repo.getTool('existing-tool');
            expect(tool?.exists).toBe(true);
            expect(tool?.configPath).toBe('/new/path');
        });
    });

    describe('CRUD operations', () => {
        beforeEach(async () => {
            // Setup clean state
            const repo = ToolRepository.getInstance();
            await repo.load(); // Will start empty
        });

        it('should add a tool', async () => {
            const repo = ToolRepository.getInstance();
            const newTool = { id: 'added', name: 'Added', configPath: '/p', exists: true };

            await repo.addTool(newTool);

            expect(repo.getTool('added')).toEqual(newTool);
            expect(fs.promises.writeFile).toHaveBeenCalled();
        });

        it('should update a tool', async () => {
            const repo = ToolRepository.getInstance();
            const newTool = { id: 'update-me', name: 'Original', configPath: '/p', exists: true };
            await repo.addTool(newTool);

            await repo.updateTool('update-me', { name: 'Updated' });

            expect(repo.getTool('update-me')?.name).toBe('Updated');
        });

        it('should remove a tool', async () => {
            const repo = ToolRepository.getInstance();
            await repo.addTool({ id: 'remove-me', name: 'Remove', configPath: '/p', exists: true });

            const removed = await repo.removeTool('remove-me');

            expect(removed).toBe(true);
            expect(repo.getTool('remove-me')).toBeUndefined();
        });
    });
});
