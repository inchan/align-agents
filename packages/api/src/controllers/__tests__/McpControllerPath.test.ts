import { vi, describe, it, expect } from 'vitest';
import { McpController } from '../McpController.js';
import path from 'path';

// Mock dependencies
vi.mock('@align-agents/cli', () => ({
    getToolMetadata: (id: string) => {
        if (id === 'gemini-cli') {
            return {
                id: 'gemini-cli',
                name: 'Gemini CLI',
                configPaths: ['/global/gemini/settings.json'],
                mcpConfigPath: '/global/gemini/settings.json',
                projectMcpConfigFilename: '.gemini/settings.json',
                supportsMcp: true
            };
        }
        if (id === 'claude-desktop') {
            return {
                id: 'claude-desktop',
                configPaths: ['/global/claude/config.json'],
                mcpConfigPath: '/global/claude/config.json',
                // No projectMcpConfigFilename
                supportsMcp: true
            };
        }
        return undefined;
    },
    LoadMasterMcpUseCase: vi.fn(),
    SyncMcpToToolUseCase: vi.fn(),
    SyncMcpToAllToolsUseCase: vi.fn(),
    scanForTools: vi.fn(),
    NodeFileSystem: class {
        join(...paths: string[]) { return paths.join('/'); }
    },
}));

vi.mock('../../container.js', () => ({
    syncService: {},
    mcpService: {}
}));

describe('McpController Path Resolution', () => {
    // Access private method for testing via prototype or any cast
    const controller = new McpController();
    const resolvePath = (controller as any).resolveConfigPath.bind(controller);

    it('should resolve global path by default', async () => {
        const path = await resolvePath('gemini-cli', undefined, undefined, undefined);
        expect(path).toBe('/global/gemini/settings.json');
    });

    it('should resolve global path when global=true', async () => {
        const path = await resolvePath('gemini-cli', true, '/some/project', undefined);
        expect(path).toBe('/global/gemini/settings.json');
    });

    it('should resolve project path when global=false and targetPath provided', async () => {
        const targetPath = '/my/project';
        const expected = path.join(targetPath, '.gemini/settings.json');

        const resolved = await resolvePath('gemini-cli', false, targetPath, undefined);
        expect(resolved).toBe(expected);
    });

    it('should return null when global=false but no targetPath', async () => {
        const resolved = await resolvePath('gemini-cli', false, undefined, undefined);
        expect(resolved).toBeNull();
    });

    it('should return null for tool without project config support', async () => {
        const targetPath = '/my/project';
        const resolved = await resolvePath('claude-desktop', false, targetPath, undefined);
        expect(resolved).toBeNull();
    });

    it('should use provided path if given', async () => {
        const provided = '/custom/path.json';
        const resolved = await resolvePath('gemini-cli', false, '/foo', provided);
        expect(resolved).toBe(provided);
    });
});
