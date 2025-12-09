import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SyncService } from '../SyncService.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';

type MockedFileSystem = {
    [K in keyof IFileSystem]: Mock;
};

// Mock dependencies
const { mockMcpRepo } = vi.hoisted(() => ({
    mockMcpRepo: {
        getDefinitions: vi.fn(),
        getSet: vi.fn(),
        getSets: vi.fn(),
    },
}));

vi.mock('../../../infrastructure/repositories/McpRepository.js', () => ({
    McpRepository: class {
        constructor() {
            return mockMcpRepo;
        }
    }
}));

// Note: McpService and RulesService are instantiated internally by SyncService
// We need to mock their dependencies instead

vi.mock('../../../services/history.js', () => ({
    saveVersion: vi.fn(),
}));

vi.mock('../../../utils/backup.js', () => ({
    createTimestampedBackup: vi.fn(),
}));

vi.mock('../../../constants/tools.js', () => ({
    KNOWN_TOOLS: [
        { id: 'claude', name: 'Claude' },
        { id: 'cursor', name: 'Cursor' },
        { id: 'codex', name: 'Codex' },
    ],
    getToolMetadata: vi.fn((id: string) => {
        const tools: Record<string, any> = {
            'claude': {
                name: 'Claude',
                supportsMcp: true,
                configPaths: ['/home/user/.config/claude/config.json'],
            },
            'cursor': {
                name: 'Cursor',
                supportsMcp: true,
                configPaths: ['/home/user/.cursor/config.json'],
            },
            'codex': {
                name: 'Codex',
                supportsMcp: false,
                configPaths: [],
            },
        };
        return tools[id] || null;
    }),
}));

vi.mock('@iarna/toml', () => ({
    parse: vi.fn((str) => JSON.parse(str)),
    stringify: vi.fn((obj) => JSON.stringify(obj, null, 2)),
}));

describe('SyncService', () => {
    let service: SyncService;
    let mockFs: MockedFileSystem;

    beforeEach(() => {
        vi.clearAllMocks();

        mockFs = {
            join: vi.fn((...parts) => parts.join('/')),
            exists: vi.fn().mockReturnValue(true),
            mkdir: vi.fn(),
            readFile: vi.fn().mockReturnValue('{}'),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            relative: vi.fn((from, to) => to),
            dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
            basename: vi.fn((p) => p.split('/').pop() || ''),
        };

        service = new SyncService(mockFs as IFileSystem);
    });

    describe('getGlobalConfig', () => {
        it('should return existing global config', () => {
            const mockConfig = { masterDir: '/custom/path', autoBackup: true };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = service.getGlobalConfig();

            expect(result.masterDir).toBe('/custom/path');
            expect(result.autoBackup).toBe(true);
        });

        it('should return default config if file does not exist', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = service.getGlobalConfig();

            expect(result.masterDir).toContain('ai-cli-syncer');
            expect(result.autoBackup).toBe(true);
        });

        it('should migrate legacy config if exists', () => {
            mockFs.exists = vi.fn()
                .mockReturnValueOnce(false)  // new config path
                .mockReturnValueOnce(true);  // legacy config path

            const legacyConfig = { masterDir: '/legacy/path', autoBackup: false };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(legacyConfig));

            const result = service.getGlobalConfig();

            expect(result.masterDir).toBe('/legacy/path');
            expect(mockFs.writeFile).toHaveBeenCalled(); // Migration writes new file
        });

        it('should handle parse errors gracefully', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('invalid json');

            const result = service.getGlobalConfig();

            expect(result.masterDir).toContain('ai-cli-syncer');
        });
    });

    describe('saveGlobalConfig', () => {
        it('should save valid config', () => {
            const config = { masterDir: '/new/path', autoBackup: true };

            service.saveGlobalConfig(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('config.json'),
                expect.stringContaining('/new/path')
            );
        });

        it('should create config directory if not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            service.saveGlobalConfig({ masterDir: '/path', autoBackup: true });

            expect(mockFs.mkdir).toHaveBeenCalled();
        });

        it('should throw error for invalid config', () => {
            expect(() => service.saveGlobalConfig({ masterDir: '', autoBackup: true }))
                .toThrow();
        });
    });

    describe('getMasterDir', () => {
        it('should return master directory from global config', () => {
            const mockConfig = { masterDir: '/custom/master', autoBackup: true };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = service.getMasterDir();

            expect(result).toBe('/custom/master');
        });
    });

    describe('setMasterDir', () => {
        it('should update master directory in config', () => {
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify({ masterDir: '/old', autoBackup: true }));

            service.setMasterDir('/new/master');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('/new/master')
            );
            // Note: McpService.setMasterDir is called internally
        });
    });

    describe('loadMasterMcp', () => {
        it('should load existing master MCP config', () => {
            const mockConfig = { mcpServers: { server1: { command: 'cmd', args: [] } } };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = service.loadMasterMcp();

            expect(result.mcpServers).toHaveProperty('server1');
        });

        it('should create default config if not exists', () => {
            mockFs.exists = vi.fn()
                .mockReturnValueOnce(true)   // masterDir
                .mockReturnValueOnce(false); // mcpPath

            const result = service.loadMasterMcp();

            expect(result.mcpServers).toEqual({});
            expect(mockFs.writeFile).toHaveBeenCalled();
        });

        it('should handle parse errors', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/path', autoBackup: true }))  // global config
                .mockReturnValueOnce('invalid json');  // mcp config

            const result = service.loadMasterMcp();

            expect(result.mcpServers).toEqual({});
        });
    });

    describe('saveMasterMcp', () => {
        it('should save valid MCP config', async () => {
            const config = { mcpServers: { server1: { command: 'cmd', args: [] } } };

            await service.saveMasterMcp(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('master-mcp.json'),
                expect.stringContaining('server1')
            );
        });

        it('should create directory if not exists', async () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            await service.saveMasterMcp({ mcpServers: {} });

            expect(mockFs.mkdir).toHaveBeenCalled();
        });
    });

    describe('loadSyncConfig', () => {
        it('should load existing sync config', () => {
            const mockConfig = { claude: { enabled: true, servers: null } };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = service.loadSyncConfig();

            expect(result.claude).toBeDefined();
            expect(result.claude.enabled).toBe(true);
        });

        it('should return default config if file not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = service.loadSyncConfig();

            expect(result).toHaveProperty('claude');
            expect(result).toHaveProperty('cursor');
        });

        it('should normalize legacy config format', () => {
            const legacyConfig = { tools: { claude: { enabled: true, servers: ['s1'] } } };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(legacyConfig));

            const result = service.loadSyncConfig();

            expect(result.claude.servers).toEqual(['s1']);
        });
    });

    describe('saveSyncConfig', () => {
        it('should save valid sync config', () => {
            const config = { claude: { enabled: true, servers: null } };

            service.saveSyncConfig(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('sync-config.json'),
                expect.any(String)
            );
        });

        it('should throw error for unknown tool', () => {
            const config = { unknown_tool: { enabled: true, servers: null } };

            expect(() => service.saveSyncConfig(config)).toThrow('Unknown tool');
        });
    });

    describe('syncToolMcp', () => {
        beforeEach(() => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: { server1: { command: 'cmd', args: [] } } }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));
        });

        it('should sync MCP to tool config', async () => {
            const result = await service.syncToolMcp(
                'claude',
                '/path/to/config.json',
                null,
                'overwrite'
            );

            expect(result).toContain('server1');
            expect(mockFs.writeFile).toHaveBeenCalled();
        });

        it('should skip sync when no master servers exist', async () => {
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));

            const result = await service.syncToolMcp(
                'claude',
                '/path/to/config.json',
                null,
                'overwrite'
            );

            expect(result).toEqual([]);
        });

        it('should sync only selected servers', async () => {
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({
                    mcpServers: {
                        server1: { command: 'cmd1', args: [] },
                        server2: { command: 'cmd2', args: [] },
                    }
                }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));

            const result = await service.syncToolMcp(
                'claude',
                '/path/to/config.json',
                ['server1'],
                'overwrite'
            );

            expect(result).toEqual(['server1']);
            expect(result).not.toContain('server2');
        });

        it('should skip sync when tool config not found (backup creates it)', async () => {
            // When the file doesn't exist, the sync checks after backup
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = await service.syncToolMcp(
                'claude',
                '/nonexistent/config.json',
                null,
                'overwrite'
            );

            // Returns empty since no master servers
            expect(result).toEqual([]);
        });

        it('should sync from specific MCP Set by sourceId', async () => {
            const mockSet = {
                id: 'set-1',
                name: 'Test Set',
                items: [{ serverId: 'def-1', disabled: false }],
            };
            const mockDefs = [
                { id: 'def-1', name: 'Server1', command: 'cmd', args: [], env: {} }
            ];

            mockMcpRepo.getSet.mockResolvedValue(mockSet);
            mockMcpRepo.getDefinitions.mockResolvedValue(mockDefs);

            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));

            const result = await service.syncToolMcp(
                'claude',
                '/path/to/config.json',
                null,
                'overwrite',
                undefined,
                'set-1'
            );

            expect(mockMcpRepo.getSet).toHaveBeenCalledWith('set-1');
            expect(result).toContain('Server1');
        });

        it('should throw error if sourceId MCP Set not found', async () => {
            mockMcpRepo.getSet.mockResolvedValue(null);

            await expect(
                service.syncToolMcp('claude', '/path/config.json', null, 'overwrite', undefined, 'nonexistent')
            ).rejects.toThrow('MCP Set not found');
        });

        it('should apply append strategy', async () => {
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({
                    mcpServers: { newServer: { command: 'new', args: [] } }
                }))
                .mockReturnValueOnce(JSON.stringify({
                    mcpServers: { existingServer: { command: 'existing', args: [] } }
                }));

            await service.syncToolMcp(
                'claude',
                '/path/to/config.json',
                null,
                'append'
            );

            const writeCall = mockFs.writeFile.mock.calls.find(
                (call) => (call as [string, string])[0].includes('config.json')
            ) as [string, string] | undefined;
            expect(writeCall).toBeDefined();
            const writtenConfig = JSON.parse(writeCall![1]);

            expect(writtenConfig.mcpServers).toHaveProperty('existingServer');
            expect(writtenConfig.mcpServers).toHaveProperty('newServer');
        });
    });

    describe('syncAllTools', () => {
        const mockRegistry = {
            tools: [
                { id: 'claude', name: 'Claude', exists: true, configPath: '/path/claude.json' },
                { id: 'cursor', name: 'Cursor', exists: true, configPath: '/path/cursor.json' },
                { id: 'codex', name: 'Codex', exists: false, configPath: '/path/codex.json' },
            ]
        };

        beforeEach(() => {
            mockFs.readFile = vi.fn()
                .mockReturnValue(JSON.stringify({
                    masterDir: '/master',
                    autoBackup: true,
                    mcpServers: { server1: { command: 'cmd', args: [] } }
                }));
        });

        it('should skip tools that are not installed', async () => {
            const results = await service.syncAllTools(undefined, mockRegistry.tools as any);

            const codexResult = results.find(r => r.toolId === 'codex');
            expect(codexResult?.status).toBe('skipped');
            expect(codexResult?.message).toContain('미설치');
        });

        it('should mark tools without MCP support as unsupported', async () => {
            const registry = {
                tools: [
                    { id: 'codex', name: 'Codex', exists: true, configPath: '/path/codex.json' },
                ]
            };

            const results = await service.syncAllTools(undefined, registry.tools as any);

            expect(results[0].status).toBe('unsupported');
        });

        it('should skip disabled tools in sync config', async () => {
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({ claude: { enabled: false, servers: null } }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: { server1: { command: 'cmd', args: [] } } }));

            const results = await service.syncAllTools(undefined, mockRegistry.tools as any);

            expect(results[0].status).toBe('skipped');
            expect(results[0].message).toContain('비활성화');
        });
    });

    // Note: syncTool tests require more complex mocking since it instantiates
    // RulesService internally. These are better covered by integration tests.
    // TOML 통합 테스트는 SyncService.toml.test.ts에서 별도로 수행
});
