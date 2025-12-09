import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../impl/SyncService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import * as toolsModule from '../../constants/tools.js';
import * as backupModule from '../../utils/backup.js';

vi.mock('../../constants/tools.js');
vi.mock('../../utils/backup.js');

describe('SyncService.syncAllTools', () => {
    let syncService: SyncService;
    let mockFs: IFileSystem;

    const mockToolsMeta = [
        { id: 'tool-enabled', name: 'Enabled Tool', paths: ['/cfg/enabled.json'], supportsMcp: true, format: 'json' as const },
        { id: 'tool-missing', name: 'Missing Tool', paths: ['/cfg/missing.json'], supportsMcp: true, format: 'json' as const },
        { id: 'tool-unsupported', name: 'Unsupported Tool', paths: ['/cfg/unsupported.json'], supportsMcp: false, format: 'json' as const },
        { id: 'tool-toml', name: 'Toml Tool', paths: ['/cfg/toml.toml'], supportsMcp: true, format: 'toml' as const },
        { id: 'tool-disabled', name: 'Disabled Tool', paths: ['/cfg/disabled.json'], supportsMcp: true, format: 'json' as const },
        { id: 'tool-error', name: 'Error Tool', paths: ['/cfg/error.json'], supportsMcp: true, format: 'json' as const },
    ];

    beforeEach(() => {
        vi.resetAllMocks();

        mockFs = {
            exists: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            join: vi.fn((...args) => args.join('/')),
            dirname: vi.fn(),
            basename: vi.fn(),
            relative: vi.fn(),
            unlink: vi.fn(),
        };

        syncService = new SyncService(mockFs);

        // stub metadata
        vi.spyOn(toolsModule, 'getToolMetadata').mockImplementation((id: string) => mockToolsMeta.find(t => t.id === id) as any);
        vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue(mockToolsMeta as any);

        // core data stubs
        vi.spyOn(syncService, 'loadMasterMcp').mockReturnValue({
            mcpServers: { serverA: { command: 'node', args: ['a.js'] } },
        });
        vi.spyOn(syncService, 'loadSyncConfig').mockReturnValue({
            'tool-enabled': { enabled: true, servers: ['serverA'] },
            'tool-missing': { enabled: true, servers: null },
            'tool-unsupported': { enabled: true, servers: null },
            'tool-toml': { enabled: true, servers: null },
            'tool-disabled': { enabled: false, servers: null },
            'tool-error': { enabled: true, servers: null },
        });

        vi.spyOn(syncService, 'syncToolMcp').mockImplementation(async (toolId: string) => {
            if (toolId === 'tool-error') {
                throw new Error('failed');
            }
            return ['serverA'];
        });

        vi.mocked(backupModule.createTimestampedBackup).mockReturnValue(null);
    });

    it('returns detailed statuses for each tool state', async () => {
        const registry = {
            tools: [
                { id: 'tool-enabled', name: 'Enabled Tool', configPath: '/cfg/enabled.json', exists: true },
                { id: 'tool-missing', name: 'Missing Tool', configPath: '/cfg/missing.json', exists: false },
                { id: 'tool-unsupported', name: 'Unsupported Tool', configPath: '/cfg/unsupported.json', exists: true },
                { id: 'tool-toml', name: 'Toml Tool', configPath: '/cfg/toml.toml', exists: true },
                { id: 'tool-disabled', name: 'Disabled Tool', configPath: '/cfg/disabled.json', exists: true },
                { id: 'tool-error', name: 'Error Tool', configPath: '/cfg/error.json', exists: true },
            ],
        };

        const results = await syncService.syncAllTools(undefined, registry.tools as any);

        expect(results).toEqual([
            { toolId: 'tool-enabled', name: 'Enabled Tool', path: '/cfg/enabled.json', status: 'success', servers: ['serverA'] },
            { toolId: 'tool-missing', name: 'Missing Tool', path: '/cfg/missing.json', status: 'skipped', message: '도구 미설치' },
            { toolId: 'tool-unsupported', name: 'Unsupported Tool', path: '/cfg/unsupported.json', status: 'unsupported', message: 'MCP 동기화 미지원 도구' },
            { toolId: 'tool-toml', name: 'Toml Tool', path: '/cfg/toml.toml', status: 'success', servers: ['serverA'] },
            { toolId: 'tool-disabled', name: 'Disabled Tool', path: '/cfg/disabled.json', status: 'skipped', message: '동기화 비활성화' },
            { toolId: 'tool-error', name: 'Error Tool', path: '/cfg/error.json', status: 'error', message: 'failed' },
        ]);
    });
});
