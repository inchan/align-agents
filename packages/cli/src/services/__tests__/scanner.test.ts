import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import { execSync } from 'child_process';
import { scanForTools, ToolConfig, saveRegistry } from '../scanner.js';
import * as toolsModule from '../../constants/tools.js';
import path from 'path';
import os from 'os';

vi.mock('fs');
vi.mock('child_process', () => ({
    execSync: vi.fn(),
}));

describe('scanForTools', () => {
    const mockTools = [
        { id: 'config-tool', name: 'Config Tool', paths: ['/config/a.json'], appPath: '/Applications/Config.app', cliCommand: 'config-cli' },
        { id: 'ai-tool', name: 'AI Tool', paths: ['/config/b.json', '/alt/b.json'], cliCommand: 'ai-tool' },
        { id: 'fallback-tool', name: 'Fallback Tool', paths: ['/fallback/mac.json', '/fallback/linux.json'], cliCommand: 'fallback-cli' },
    ];

    beforeEach(() => {
        vi.resetAllMocks();

        // constants mock
        vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue(mockTools as any);

        // fs defaults
        vi.mocked(fs.existsSync).mockImplementation(() => false);
        vi.mocked(execSync).mockImplementation(() => { throw new Error('not found'); });
    });

    it('prefers existing config file', async () => {
        vi.mocked(fs.existsSync).mockImplementation((p: any) => p === '/config/a.json');

        const tools = await scanForTools();

        const target = tools.find(t => t.id === 'config-tool') as ToolConfig;
        expect(target.exists).toBe(true);
        expect(target.configPath).toBe('/config/a.json');
    });

    it('falls back to CLI detection when config/app is missing', async () => {
        vi.mocked(execSync).mockImplementation((cmd: any) => {
            if (cmd.includes('ai-tool')) return Buffer.from('');
            throw new Error('not found');
        });

        const tools = await scanForTools();

        const target = tools.find(t => t.id === 'ai-tool') as ToolConfig;
        expect(target.exists).toBe(true);
        expect(target.configPath).toBe('/config/b.json');
    });

    it('uses platform-specific fallback path when nothing is detected', async () => {
        const tools = await scanForTools();

        const target = tools.find(t => t.id === 'fallback-tool') as ToolConfig;
        expect(target.exists).toBe(false);
        const expectedFallback = '';
        expect(target.configPath).toBe(expectedFallback);
    });

    it('uses non-darwin fallback when platform is linux', async () => {
        const platformGetter = vi.spyOn(process, 'platform', 'get').mockReturnValue('linux');
        vi.mocked(fs.existsSync).mockImplementation((p: any) => p === '/fallback/linux.json');

        const tools = await scanForTools();
        platformGetter.mockRestore();

        const target = tools.find(t => t.id === 'fallback-tool') as ToolConfig;
        expect(target.configPath).toBe('/fallback/linux.json');
    });

    it('detects via app bundle when config missing', async () => {
        vi.mocked(fs.existsSync).mockImplementation((p: any) => p === '/Applications/Config.app');

        const tools = await scanForTools();
        const target = tools.find(t => t.id === 'config-tool') as ToolConfig;
        expect(target.exists).toBe(true);
        expect(target.configPath).toBe('/config/a.json');
    });

    it('saves registry file', () => {
        const homedir = '/tmp/home';
        vi.spyOn(os, 'homedir').mockReturnValue(homedir as any);
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const writeSpy = vi.spyOn(fs, 'writeFileSync');
        const tools: ToolConfig[] = [{ id: 'x', name: 'X', configPath: '/p', exists: true }];

        const registryPath = saveRegistry(tools);

        expect(registryPath).toBe(path.join(homedir, '.ai-cli-syncer', 'registry.json'));
        expect(writeSpy).toHaveBeenCalled();
    });

    it('saves registry without creating directory when exists', () => {
        const homedir = '/tmp/home';
        vi.spyOn(os, 'homedir').mockReturnValue(homedir as any);
        vi.mocked(fs.existsSync).mockReturnValue(true);
        const mkdirSpy = vi.spyOn(fs, 'mkdirSync');
        const writeSpy = vi.spyOn(fs, 'writeFileSync');

        saveRegistry([{ id: 'x', name: 'X', configPath: '/p', exists: true }]);

        expect(mkdirSpy).not.toHaveBeenCalled();
        expect(writeSpy).toHaveBeenCalled();
    });
});
