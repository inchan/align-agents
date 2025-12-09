import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncService } from '../impl/SyncService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import * as toolsModule from '../../constants/tools.js';
import * as backupModule from '../../utils/backup.js';
import * as historyModule from '../history.js';

// 모킹 설정
vi.mock('../../constants/tools.js');
vi.mock('../../utils/backup.js');
vi.mock('../history.js');
vi.mock('../backup.js', () => ({
    createBackup: vi.fn(),
}));

// os 모듈 모킹
const osMocks = vi.hoisted(() => ({
    homedir: vi.fn(() => '/mock/home'),
}));

vi.mock('os', () => ({
    default: {
        homedir: osMocks.homedir,
    },
    homedir: osMocks.homedir,
}));

// fs 모듈 모킹 (StateService 등 내부에서 fs를 직접 사용하는 경우 대비)
vi.mock('fs', () => ({
    default: {
        existsSync: vi.fn(() => true),
        mkdirSync: vi.fn(),
        writeFileSync: vi.fn(),
        readFileSync: vi.fn(() => '{"tools": {}}'),
    },
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(() => '{"tools": {}}'),
}));

describe('SyncService (MCP)', () => {
    let syncService: SyncService;
    let mockFs: IFileSystem;

    const mockHome = '/mock/home';
    const mockMasterDir = '/mock/home/.config/ai-cli-syncer';
    const mockMcpPath = '/mock/home/.config/ai-cli-syncer/master-mcp.json';
    const mockToolConfigPath = '/mock/tool/config.json';
    const mockTomlConfigPath = '/mock/tool/config.toml';
    const mockGlobalConfigPath = '/mock/home/.ai-cli-syncer/config.json';
    const mockLegacyGlobalConfigPath = '/mock/home/.config/ai-cli-syncer/config.json';

    beforeEach(() => {
        vi.resetAllMocks();

        // os 모킹 설정
        osMocks.homedir.mockReturnValue(mockHome);

        // Mock FileSystem
        mockFs = {
            exists: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            join: vi.fn((...args) => args.join('/')),
            dirname: vi.fn(),
            basename: vi.fn(),
            relative: vi.fn((from, to) => to.replace(from, '').replace(/^\//, '')),
            unlink: vi.fn(),
        };

        syncService = new SyncService(mockFs);

        // 기본 fs 모킹
        vi.mocked(mockFs.exists).mockReturnValue(true);
        vi.mocked(mockFs.readFile).mockImplementation((p) => {
            const pathStr = p.toString();

            if (pathStr === mockMcpPath) {
                return JSON.stringify({
                    mcpServers: {
                        'server1': { command: 'node', args: ['s1.js'] },
                        'server2': { command: 'node', args: ['s2.js'] }
                    }
                });
            }
            if (pathStr === mockToolConfigPath) {
                return JSON.stringify({
                    mcpServers: {
                        'existing': { command: 'node', args: ['old.js'] }
                    }
                });
            }
            if (pathStr === mockTomlConfigPath) {
                return `
[mcpServers.existing]
command = "node"
args = ["old.js"]
`;
            }
            if (pathStr === mockGlobalConfigPath) {
                return JSON.stringify({ masterDir: mockMasterDir, autoBackup: false });
            }
            return '';
        });
        vi.mocked(mockFs.writeFile).mockImplementation(() => { });
        vi.mocked(mockFs.mkdir).mockImplementation(() => undefined);

        // 백업 모킹
        vi.spyOn(backupModule, 'createTimestampedBackup').mockReturnValue(null);
        vi.spyOn(historyModule, 'saveVersion').mockImplementation(() => 'mock-version-id');
    });

    describe('saveGlobalConfig', () => {
        it('creates directory when missing and writes validated config', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);

            syncService.saveGlobalConfig({ masterDir: '/custom', autoBackup: true });

            expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/home/.ai-cli-syncer');
            expect(mockFs.writeFile).toHaveBeenCalledWith('/mock/home/.ai-cli-syncer/config.json', expect.stringContaining('"masterDir": "/custom"'));
        });
    });

    describe('loadMasterMcp', () => {
        it('should load master mcp config', () => {
            const config = syncService.loadMasterMcp();
            expect(config.mcpServers).toHaveProperty('server1');
            expect(config.mcpServers).toHaveProperty('server2');
        });

        it('should create default config if not exists', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir);

            const config = syncService.loadMasterMcp();

            expect(mockFs.writeFile).toHaveBeenCalledWith(mockMcpPath, expect.stringContaining('mcpServers'));
            expect(config.mcpServers).toEqual({});
        });

        it('creates master dir when missing', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);

            syncService.loadMasterMcp();

            expect(mockFs.mkdir).toHaveBeenCalledWith(mockMasterDir);
        });

        it('recovers from parse error by writing default', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === mockMcpPath);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === mockMcpPath) return 'not-json';
                if (p === mockGlobalConfigPath) return JSON.stringify({ masterDir: mockMasterDir, autoBackup: false });
                return '';
            });
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const config = syncService.loadMasterMcp();

            expect(warnSpy).toHaveBeenCalled();
            expect(config.mcpServers).toEqual({});
            expect(mockFs.writeFile).toHaveBeenCalledWith(mockMcpPath, expect.stringContaining('mcpServers'));
        });
    });

    describe('saveMasterMcp', () => {
        it('writes config and skips auto-backup when disabled', async () => {
            vi.mocked(mockFs.exists).mockReturnValue(true);
            vi.spyOn(syncService, 'getGlobalConfig').mockReturnValue({ masterDir: mockMasterDir, autoBackup: false });

            await syncService.saveMasterMcp({ mcpServers: { s1: { command: 'node', args: [] } } });

            expect(historyModule.saveVersion).toHaveBeenCalled();
            expect(mockFs.writeFile).toHaveBeenCalledWith(mockMcpPath, expect.stringContaining('"s1"'));
        });

        it('triggers auto-backup when enabled', async () => {
            const backupMod = await import('../backup.js');
            vi.mocked(mockFs.exists).mockReturnValue(true);
            vi.spyOn(syncService, 'getGlobalConfig').mockReturnValue({ masterDir: mockMasterDir, autoBackup: true });

            await syncService.saveMasterMcp({ mcpServers: { s1: { command: 'node', args: [] } } });

            expect(backupMod.createBackup).toHaveBeenCalledWith('Auto-backup: MCP config updated');
        });

        it('creates master dir when missing and warns if saveVersion fails', async () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });
            vi.mocked(mockFs.exists).mockReturnValue(false);
            vi.mocked(historyModule.saveVersion).mockImplementation(() => { throw new Error('fail'); });

            await syncService.saveMasterMcp({ mcpServers: { s1: { command: 'node', args: [] } } });

            expect(mockFs.mkdir).toHaveBeenCalledWith(mockMasterDir);
            expect(warnSpy).toHaveBeenCalled();
            expect(mockFs.writeFile).toHaveBeenCalledWith(mockMcpPath, expect.stringContaining('"s1"'));
        });
    });

    describe('syncToolMcp', () => {
        it('should sync selected servers using merge strategy (default)', () => {
            const servers = ['server1'];

            syncService.syncToolMcp('tool1', mockToolConfigPath, servers, 'append');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                mockToolConfigPath,
                expect.stringContaining('"server1"')
            );

            const writeCall = vi.mocked(mockFs.writeFile).mock.calls.find(call => call[0] === mockToolConfigPath);
            const writtenContent = JSON.parse(writeCall![1] as string);

            expect(writtenContent.mcpServers).toHaveProperty('server1');
            expect(writtenContent.mcpServers).toHaveProperty('existing');
            expect(writtenContent.mcpServers).not.toHaveProperty('server2');
        });

        it('should sync using overwrite strategy', () => {
            const servers = ['server1'];

            syncService.syncToolMcp('tool1', mockToolConfigPath, servers, 'overwrite');

            const writeCall = vi.mocked(mockFs.writeFile).mock.calls.find(call => call[0] === mockToolConfigPath);
            const writtenContent = JSON.parse(writeCall![1] as string);

            expect(writtenContent.mcpServers).toHaveProperty('server1');
            expect(writtenContent.mcpServers).not.toHaveProperty('existing');
        });

        it('should sync TOML files with merge strategy', async () => {
            const servers = ['server1'];
            vi.mocked(mockFs.exists).mockReturnValue(true);

            const result = await syncService.syncToolMcp('tool1', mockTomlConfigPath, servers, 'append');

            expect(result).toEqual(['server1']);
            const writeCall = vi.mocked(mockFs.writeFile).mock.calls.find(call => call[0] === mockTomlConfigPath);
            const writtenContent = writeCall ? (writeCall[1] as string) : '';
            expect(writtenContent).toContain('[mcpServers.existing]');
            expect(writtenContent).toContain('[mcp_servers.server1]');
            expect(writtenContent).toContain('command = "node"');
        });

        it('should create backup before sync', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            syncService.syncToolMcp('tool1', mockToolConfigPath, ['server1']);

            expect(backupModule.createTimestampedBackup).toHaveBeenCalledWith(mockToolConfigPath, undefined);
        });

        it('returns empty when master MCP has no servers', async () => {
            vi.spyOn(syncService, 'loadMasterMcp').mockReturnValue({ mcpServers: {} });

            const result = await syncService.syncToolMcp('tool1', mockToolConfigPath, null);

            expect(result).toEqual([]);
        });

        it('creates new config when tool config file is missing', async () => {
            vi.spyOn(syncService, 'loadMasterMcp').mockReturnValue({ mcpServers: { s1: { command: 'node', args: [] } } });
            const missingPath = '/nope/config.json';
            vi.mocked(mockFs.exists).mockImplementation((p) => p === missingPath ? false : true);

            await syncService.syncToolMcp('tool1', missingPath, ['s1']);

            expect(mockFs.writeFile).toHaveBeenCalledWith(missingPath, expect.stringContaining('"s1"'));
        });

        it('throws when tool config is invalid JSON', async () => {
            vi.spyOn(syncService, 'loadMasterMcp').mockReturnValue({ mcpServers: { s1: { command: 'node', args: [] } } });
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockToolConfigPath ? true : true);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === mockToolConfigPath) return 'not-json';
                if (p === mockGlobalConfigPath) return JSON.stringify({ masterDir: mockMasterDir, autoBackup: false });
                if (p === mockMcpPath) return JSON.stringify({ mcpServers: { s1: { command: 'node', args: [] } } });
                return '';
            });

            await expect(syncService.syncToolMcp('tool1', mockToolConfigPath, ['s1'])).rejects.toThrowError('JSON으로 파싱할 수 없는 설정 파일');
        });

        it('throws when tool config is invalid TOML', async () => {
            vi.spyOn(syncService, 'loadMasterMcp').mockReturnValue({ mcpServers: { s1: { command: 'node', args: [] } } });
            vi.mocked(mockFs.exists).mockReturnValue(true);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === mockTomlConfigPath) return 'not-toml';
                if (p === mockGlobalConfigPath) return JSON.stringify({ masterDir: mockMasterDir, autoBackup: false });
                if (p === mockMcpPath) return JSON.stringify({ mcpServers: { s1: { command: 'node', args: [] } } });
                return '';
            });

            await expect(syncService.syncToolMcp('tool1', mockTomlConfigPath, ['s1'])).rejects.toThrowError('TOML으로 파싱할 수 없는 설정 파일');
        });

        it('returns empty when selected servers are not in master', async () => {
            const result = await syncService.syncToolMcp('tool1', mockToolConfigPath, ['missing'], 'append');

            expect(result).toEqual([]);
        });

        it('creates mcpServers container when missing', () => {
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === mockToolConfigPath) return '{}';
                if (p === mockGlobalConfigPath) return JSON.stringify({ masterDir: mockMasterDir, autoBackup: false });
                if (p === mockMcpPath) return JSON.stringify({ mcpServers: { s1: { command: 'node', args: [] } } });
                return '';
            });

            syncService.syncToolMcp('tool1', mockToolConfigPath, ['s1']);

            const writeCall = vi.mocked(mockFs.writeFile).mock.calls.find(call => call[0] === mockToolConfigPath);
            const written = JSON.parse(writeCall![1] as string);
            expect(written.mcpServers).toHaveProperty('s1');
        });
    });

    describe('global config handling', () => {
        it('migrates legacy config to new location', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === mockLegacyGlobalConfigPath);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === mockLegacyGlobalConfigPath) {
                    return JSON.stringify({ masterDir: '/legacy/master', autoBackup: true });
                }
                return '';
            });

            const config = syncService.getGlobalConfig();

            expect(config.masterDir).toBe('/legacy/master');
            expect(mockFs.writeFile).toHaveBeenCalledWith(mockGlobalConfigPath, expect.stringContaining('/legacy/master'));
        });

        it('falls back to default when global config parse fails', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockGlobalConfigPath);
            vi.mocked(mockFs.readFile).mockReturnValue('not-json');
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const config = syncService.getGlobalConfig();

            expect(config.masterDir).toBe(mockMasterDir);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('falls back to default when legacy migration fails', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockLegacyGlobalConfigPath);
            vi.mocked(mockFs.readFile).mockReturnValue('not-json');
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            const config = syncService.getGlobalConfig();

            expect(config.masterDir).toBe(mockMasterDir);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('updates master dir via setter and persists', () => {
            vi.spyOn(syncService, 'getGlobalConfig').mockReturnValue({ masterDir: '/old', autoBackup: true });

            syncService.setMasterDir('/new');

            expect(mockFs.writeFile).toHaveBeenCalledWith(mockGlobalConfigPath, expect.stringContaining('"masterDir": "/new"'));
        });
    });

    describe('sync config validation', () => {
        it('throws on unknown tool id when saving sync config', () => {
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'known', name: 'Known' }] as any);

            expect(() => syncService.saveSyncConfig({ unknown: { enabled: true, servers: null } })).toThrowError('Unknown tool in sync-config');
        });

        it('normalizes legacy sync config shape', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === `${mockMasterDir}/sync-config.json`);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === `${mockMasterDir}/sync-config.json`) {
                    return JSON.stringify({
                        tools: {
                            'tool-a': { enabled: false, servers: ['a'] },
                        }
                    });
                }
                if (p === mockGlobalConfigPath) {
                    return JSON.stringify({ masterDir: mockMasterDir, autoBackup: true });
                }
                return '';
            });
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([
                { id: 'tool-a', name: 'Tool A' },
                { id: 'tool-b', name: 'Tool B' },
            ] as any);

            const config = syncService.loadSyncConfig();

            expect(config['tool-a']).toEqual({ enabled: false, servers: ['a'] });
            expect(config['tool-b']).toEqual({ enabled: true, servers: null });
        });

        it('returns defaults when sync-config parse fails', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === `${mockMasterDir}/sync-config.json`);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === `${mockMasterDir}/sync-config.json`) {
                    return 'not-json';
                }
                if (p === mockGlobalConfigPath) {
                    return JSON.stringify({ masterDir: mockMasterDir, autoBackup: true });
                }
                return '';
            });
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'only', name: 'Only' }] as any);

            const config = syncService.loadSyncConfig();

            expect(config['only']).toEqual({ enabled: true, servers: null });
        });

        it('creates master dir when saving sync config if missing', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'only', name: 'Only' }] as any);

            syncService.saveSyncConfig({ only: { enabled: true, servers: null } });

            expect(mockFs.mkdir).toHaveBeenCalledWith(mockMasterDir);
            expect(mockFs.writeFile).toHaveBeenCalledWith(`${mockMasterDir}/sync-config.json`, expect.any(String));
        });

        it('returns defaults when parsed value is not object', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === `${mockMasterDir}/sync-config.json`);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === `${mockMasterDir}/sync-config.json`) {
                    return '[]';
                }
                if (p === mockGlobalConfigPath) {
                    return JSON.stringify({ masterDir: mockMasterDir, autoBackup: true });
                }
                return '';
            });
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'only', name: 'Only' }] as any);

            const config = syncService.loadSyncConfig();

            expect(config['only']).toEqual({ enabled: true, servers: null });
        });

        it('returns defaults when parsed value is primitive', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === `${mockMasterDir}/sync-config.json`);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === `${mockMasterDir}/sync-config.json`) {
                    return '1';
                }
                if (p === mockGlobalConfigPath) {
                    return JSON.stringify({ masterDir: mockMasterDir, autoBackup: true });
                }
                return '';
            });
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'only', name: 'Only' }] as any);

            const config = syncService.loadSyncConfig();

            expect(config['only']).toEqual({ enabled: true, servers: null });
        });

        it('normalizes entries with missing or invalid values', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir || p === `${mockMasterDir}/sync-config.json`);
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === `${mockMasterDir}/sync-config.json`) {
                    return JSON.stringify({
                        'tool-a': null,
                        'tool-b': { servers: ['x'] },
                    });
                }
                if (p === mockGlobalConfigPath) {
                    return JSON.stringify({ masterDir: mockMasterDir, autoBackup: true });
                }
                return '';
            });
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([
                { id: 'tool-a', name: 'Tool A' },
                { id: 'tool-b', name: 'Tool B' },
            ] as any);

            const config = syncService.loadSyncConfig();

            expect(config['tool-a']).toEqual({ enabled: true, servers: null });
            expect(config['tool-b']).toEqual({ enabled: true, servers: ['x'] });
        });

        it('returns defaults when sync config file missing', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'only', name: 'Only' }] as any);

            const config = syncService.loadSyncConfig();

            expect(config['only']).toEqual({ enabled: true, servers: null });
        });

        it('does not create master dir when it exists on save', () => {
            vi.mocked(mockFs.exists).mockReturnValue(true);
            vi.spyOn(toolsModule, 'KNOWN_TOOLS', 'get').mockReturnValue([{ id: 'only', name: 'Only' }] as any);

            syncService.saveSyncConfig({ only: { enabled: true, servers: null } });

            expect(mockFs.mkdir).not.toHaveBeenCalledWith(mockMasterDir);
            expect(mockFs.writeFile).toHaveBeenCalled();
        });
    });

    describe('syncToolMcp additional coverage', () => {
        it('uses all servers when serverNames is null', async () => {
            vi.spyOn(syncService, 'loadMasterMcp').mockReturnValue({ mcpServers: { s1: { command: 'node', args: [] }, s2: { command: 'node', args: [] } } });

            const applied = await syncService.syncToolMcp('tool1', mockToolConfigPath, null, 'append');

            expect(applied).toEqual(['s1', 's2']);
        });
    });
});
