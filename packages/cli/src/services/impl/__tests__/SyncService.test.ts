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

const { mockGlobalRepo, mockSyncConfigRepo } = vi.hoisted(() => ({
    mockGlobalRepo: {
        load: vi.fn(),
        save: vi.fn(),
        get: vi.fn(), // if applicable
    },
    mockSyncConfigRepo: {
        load: vi.fn(),
        save: vi.fn(),
    }
}));

vi.mock('../../../infrastructure/repositories/GlobalConfigRepository.js', () => ({
    GlobalConfigRepository: class {
        constructor() {
            return mockGlobalRepo;
        }
    }
}));

vi.mock('../../../infrastructure/repositories/SyncConfigRepository.js', () => ({
    SyncConfigRepository: class {
        constructor() {
            return mockSyncConfigRepo;
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
        it('should return existing global config', async () => {
            const mockConfig = { masterDir: '/custom/path', autoBackup: true };
            mockGlobalRepo.load.mockResolvedValue(mockConfig);

            const result = await service.getGlobalConfig();

            expect(result.masterDir).toBe('/custom/path');
            expect(result.autoBackup).toBe(true);
        });

        it('should return default config if repo returns default', async () => {
            // GlobalConfigRepo handles defaults. If load returns config, it is used.
            // If we want default, we assume repo returns defaults.
            // But repo.load() returns what is in DB.
            // SyncService constructor inits repo with default.
            // We can mock load to return a config.
            const defaultConfig = { masterDir: 'default', autoBackup: true };
            mockGlobalRepo.load.mockResolvedValue(defaultConfig);

            const result = await service.getGlobalConfig();
            expect(result).toEqual(defaultConfig);
        });




    });

    describe('saveGlobalConfig', () => {


        it('should save valid config', async () => {
            const config = { masterDir: '/new/path', autoBackup: true };

            await service.saveGlobalConfig(config);

            expect(mockGlobalRepo.save).toHaveBeenCalledWith(config);
        });

        it('should throw error for invalid config', async () => {
            await expect(service.saveGlobalConfig({ masterDir: '', autoBackup: true }))
                .rejects.toThrow();
        });
    });

    describe('getMasterDir', () => {
        it('should return master directory from global config', async () => {
            const mockConfig = { masterDir: '/custom/master', autoBackup: true };
            mockGlobalRepo.load.mockResolvedValue(mockConfig);

            const result = await service.getMasterDir();

            expect(result).toBe('/custom/master');
        });
    });

    describe('setMasterDir', () => {
        it('should update master directory in config', async () => {
            mockGlobalRepo.load.mockResolvedValue({ masterDir: '/old', autoBackup: true });

            await service.setMasterDir('/new/master');

            expect(mockGlobalRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ masterDir: '/new/master' })
            );
        });
    });

    // Master MCP tests removed - methods no longer exist

    describe('loadSyncConfig', () => {
        it('should load existing sync config', async () => {
            const mockConfig = { claude: { enabled: true, servers: null } };
            mockSyncConfigRepo.load.mockResolvedValue(mockConfig);

            const result = await service.loadSyncConfig();

            expect(result.claude).toBeDefined();
            expect(result.claude.enabled).toBe(true);
        });

        it('should return empty config if repo returns empty', async () => {
            mockSyncConfigRepo.load.mockResolvedValue({});

            const result = await service.loadSyncConfig();

            expect(result).toEqual({});
        });
    });

    describe('saveSyncConfig', () => {
        it('should save valid sync config', async () => {
            const config = { claude: { enabled: true, servers: null } };

            await service.saveSyncConfig(config);

            expect(mockSyncConfigRepo.save).toHaveBeenCalledWith(config);
        });

        it('should throw error for unknown tool', async () => {
            const config = { unknown_tool: { enabled: true, servers: null } };

            await expect(service.saveSyncConfig(config)).rejects.toThrow("Tool with id 'unknown_tool' not found");
        });
    });

    describe('syncToolMcp', () => {
        beforeEach(() => {
            vi.clearAllMocks(); // Ensure clear before setting values
            mockMcpRepo.getSet.mockReset();
            mockMcpRepo.getDefinitions.mockReset();

            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn()
                .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
                .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));

            // Mock Repo Loads
            mockGlobalRepo.load.mockResolvedValue({ masterDir: '/master', autoBackup: true });
            mockSyncConfigRepo.load.mockResolvedValue({ claude: { enabled: true, servers: null } });

            // Default empty mocks to prevent null errors
            mockMcpRepo.getSet.mockResolvedValue({ id: 'set-1', name: 'Test Set', items: [] });
            mockMcpRepo.getDefinitions.mockResolvedValue([]);
        });

        it.skip('placeholder', () => {});
    });

    it('should sync MCP to tool config', async () => {
        mockMcpRepo.getSet.mockImplementation(async (id) => {
            return {
                id: 'set-1',
                name: 'Test Set',
                items: [{ serverId: 'server1', disabled: false }]
            };
        });
        mockMcpRepo.getDefinitions.mockResolvedValue([
            { id: 'server1', name: 'Server1', command: 'cmd', args: [], env: {} }
        ]);

        const result = await service.syncToolMcp(
            'claude',
            '/path/to/config.json',
            null,
            'overwrite',
            undefined,
            'set-1'
        );

        expect(result).toContain('Server1');
        expect(mockFs.writeFile).toHaveBeenCalled();
    });

    it('should skip sync when no master servers exist', async () => {
        mockFs.readFile = vi.fn()
            .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
            .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }));

        mockMcpRepo.getSet.mockResolvedValue({ id: 'set-1', name: 'Set 1', items: [] });
        mockMcpRepo.getDefinitions.mockResolvedValue([]);

        const result = await service.syncToolMcp(
            'claude',
            '/path/to/config.json',
            null,
            'overwrite',
            undefined,
            'set-1'
        );

        expect(result).toEqual([]);
    });

    it('should sync only selected servers', async () => {
        mockMcpRepo.getDefinitions.mockResolvedValue([
            { id: 'server1', name: 'Server 1', command: 'cmd1', args: [], env: {} },
            { id: 'server2', name: 'Server 2', command: 'cmd2', args: [], env: {} },
        ]);
        mockMcpRepo.getSet.mockResolvedValue({
            id: 'set-1',
            items: [
                { serverId: 'server1', disabled: false },
                { serverId: 'server2', disabled: false }
            ]
        });

        const result = await service.syncToolMcp(
            'claude',
            '/path/to/config.json',
            ['Server 1'],
            'overwrite',
            undefined,
            'set-1'
        );

        expect(result).toEqual(['Server 1']);
        expect(result).not.toContain('server2');
    });

    it('should skip sync when tool config not found (backup creates it)', async () => {
        // When the file doesn't exist, the sync checks after backup
        mockGlobalRepo.load.mockResolvedValue({ masterDir: '/master', autoBackup: true });

        // Force reset definitions to ensure no leakage from previous tests
        mockMcpRepo.getDefinitions.mockResolvedValue([]);
        mockMcpRepo.getSet.mockResolvedValue({ id: 'set-1', name: 'Set 1', items: [] });

        // No need to mock readFile for masterDir config
        mockFs.exists = vi.fn().mockReturnValue(false);

        const result = await service.syncToolMcp(
            'claude',
            '/nonexistent/config.json',
            null,
            'overwrite',
            undefined,
            'set-1'
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
        ).rejects.toThrow("MCP Set with id 'nonexistent' not found");
    });

    it('should apply smart-update strategy', async () => {
        // Reset readFile to clear beforeEach queue
        mockFs.readFile.mockReset();

        // Mock target file existence and content
        mockFs.exists.mockReturnValue(true);
        // readFile needs to return the tool config content directly when called
        mockFs.readFile.mockReturnValue(JSON.stringify({
            mcpServers: { existingServer: { command: 'existing', args: [] } }
        }));

        // Mock source data
        mockMcpRepo.getSet.mockResolvedValue({
            id: 'set-1',
            items: [{ serverId: 'newServer', disabled: false }]
        });
        mockMcpRepo.getDefinitions.mockResolvedValue([
            { id: 'newServer', name: 'New Server', command: 'new', args: ['--new'], env: {} }
        ]);

        await service.syncToolMcp(
            'claude',
            '/path/to/config.json',
            null,
            'smart-update',
            undefined,
            'set-1'
        );

        const writeCall = mockFs.writeFile.mock.calls.find(
            (call) => (call as [string, string])[0].includes('config.json')
        ) as [string, string] | undefined;
        expect(writeCall).toBeDefined();
        const writtenConfig = JSON.parse(writeCall![1]);

        expect(writtenConfig.mcpServers).toHaveProperty('existingServer');
        expect(writtenConfig.mcpServers).toHaveProperty('New Server');
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
            mockGlobalRepo.load.mockResolvedValue({ masterDir: '/master', autoBackup: true });
        });

        it('should skip tools that are not installed', async () => {
            const results = await service.syncAllTools('set-1', mockRegistry.tools as any);

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

            const results = await service.syncAllTools('set-1', registry.tools as any);

            expect(results[0].status).toBe('unsupported');
        });

        it('should skip disabled tools in sync config', async () => {
            mockGlobalRepo.load.mockResolvedValue({ masterDir: '/master', autoBackup: true });
            mockSyncConfigRepo.load.mockResolvedValue({ claude: { enabled: false, servers: null } });

            const results = await service.syncAllTools('set-1', mockRegistry.tools as any);

            expect(results[0].status).toBe('skipped');
            expect(results[0].message).toContain('비활성화');
        });
    });

    // Note: syncTool tests require more complex mocking since it instantiates
    // RulesService internally. These are better covered by integration tests.
    // TOML 통합 테스트는 SyncService.toml.test.ts에서 별도로 수행
});
