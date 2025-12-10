import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SyncConfigRepository } from '../SyncConfigRepository.js';
import { IDatabase, IRunResult } from '../../../interfaces/IDatabase.js';

type MockStatement<T = any> = {
    get: Mock<(...params: any[]) => T | undefined>;
    all: Mock<(...params: any[]) => T[]>;
    run: Mock<(...params: any[]) => IRunResult>;
};

type MockDatabase = {
    prepare: Mock<(sql: string) => MockStatement>;
    transaction: Mock<(fn: () => any) => any>;
    exec: Mock<(sql: string) => void>;
    close: Mock<() => void>;
    open: boolean;
};

// Mock dependencies
vi.mock('../../../constants/tools.js', () => ({
    KNOWN_TOOLS: [
        { id: 'claude', name: 'Claude' },
        { id: 'cursor', name: 'Cursor' },
        { id: 'codex', name: 'Codex' },
    ],
    getToolMetadata: vi.fn((id: string) => {
        const tools: Record<string, any> = {
            'claude': { name: 'Claude', supportsMcp: true },
            'cursor': { name: 'Cursor', supportsMcp: true },
            'codex': { name: 'Codex', supportsMcp: false },
        };
        return tools[id] || null;
    }),
}));

describe('SyncConfigRepository', () => {
    let repository: SyncConfigRepository;
    let mockDb: MockDatabase;
    let mockStatement: MockStatement;

    beforeEach(() => {
        vi.clearAllMocks();

        mockStatement = {
            get: vi.fn(),
            all: vi.fn().mockReturnValue([]),
            run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
        };

        mockDb = {
            prepare: vi.fn().mockReturnValue(mockStatement),
            transaction: vi.fn((fn) => fn()),
            exec: vi.fn(),
            close: vi.fn(),
            open: true,
        };

        repository = new SyncConfigRepository(mockDb as unknown as IDatabase);
    });

    describe('load', () => {
        it('should load existing sync config from database', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { tool_id: 'claude', enabled: 1, servers: JSON.stringify(['server1']) },
            ]);

            const result = await repository.load();

            expect(result.claude.enabled).toBe(true);
            expect(result.claude.servers).toEqual(['server1']);
        });

        it('should return default config if table is empty', async () => {
            mockStatement.all = vi.fn().mockReturnValue([]);

            const result = await repository.load();

            expect(result).toHaveProperty('claude');
            expect(result).toHaveProperty('cursor');
            expect(result).toHaveProperty('codex');
            expect(result.claude.enabled).toBe(true);
            expect(result.codex.enabled).toBe(false); // supportsMcp = false
        });

        it('should return default config on database error', async () => {
            mockStatement.all = vi.fn().mockImplementation(() => {
                throw new Error('DB Error');
            });

            const result = await repository.load();

            expect(result).toHaveProperty('claude');
            expect(result).toHaveProperty('cursor');
        });

        it('should parse servers JSON correctly', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { tool_id: 'claude', enabled: 1, servers: JSON.stringify(['s1', 's2']) },
            ]);

            const result = await repository.load();

            expect(result.claude.servers).toEqual(['s1', 's2']);
        });

        it('should handle null servers', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { tool_id: 'claude', enabled: 1, servers: null },
            ]);

            const result = await repository.load();

            expect(result.claude.servers).toBeNull();
        });

        it('should convert enabled from integer to boolean', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { tool_id: 'claude', enabled: 0, servers: null },
                { tool_id: 'cursor', enabled: 1, servers: null },
            ]);

            const result = await repository.load();

            expect(result.claude.enabled).toBe(false);
            expect(result.cursor.enabled).toBe(true);
        });

        it('should merge loaded config with defaults', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { tool_id: 'claude', enabled: 0, servers: null },
            ]);

            const result = await repository.load();

            // claude from DB
            expect(result.claude.enabled).toBe(false);
            // cursor and codex from defaults
            expect(result.cursor.enabled).toBe(true);
            expect(result.codex.enabled).toBe(false);
        });
    });

    describe('save', () => {
        it('should save valid config to database', async () => {
            const config = { claude: { enabled: true, servers: null } };

            await repository.save(config);

            expect(mockDb.transaction).toHaveBeenCalled();
            expect(mockStatement.run).toHaveBeenCalled();
        });

        it('should clear existing config before saving', async () => {
            const config = { claude: { enabled: true, servers: null } };

            await repository.save(config);

            const prepareCalls = mockDb.prepare.mock.calls.map(c => c[0]);
            expect(prepareCalls.some(sql => sql.includes('DELETE'))).toBe(true);
        });

        it('should throw error for unknown tool', async () => {
            const config = { unknown_tool: { enabled: true, servers: null } };

            await expect(repository.save(config as any)).rejects.toThrow('Unknown tool in sync-config');
        });

        it('should save config with servers array', async () => {
            const config = { claude: { enabled: true, servers: ['server1', 'server2'] } };

            await repository.save(config);

            // Verify run was called with serialized servers
            const runCalls = mockStatement.run.mock.calls;
            const hasServers = runCalls.some(call =>
                typeof call[2] === 'string' && call[2].includes('server1')
            );
            expect(hasServers).toBe(true);
        });

        it('should save config with disabled tool', async () => {
            const config = { claude: { enabled: false, servers: null } };

            await repository.save(config);

            // Verify enabled=0 was passed
            const runCalls = mockStatement.run.mock.calls;
            const hasDisabled = runCalls.some(call => call[1] === 0);
            expect(hasDisabled).toBe(true);
        });

        it('should validate config with Zod schema', async () => {
            // Valid config should not throw
            await expect(repository.save({
                claude: { enabled: true, servers: null },
                cursor: { enabled: false, servers: ['s1'] }
            })).resolves.not.toThrow();
        });

        it('should convert enabled boolean to integer', async () => {
            const config = { claude: { enabled: true, servers: null } };

            await repository.save(config);

            const runCalls = mockStatement.run.mock.calls;
            const hasEnabled = runCalls.some(call => call[1] === 1);
            expect(hasEnabled).toBe(true);
        });
    });

    describe('default config generation', () => {
        it('should generate default config for all known tools', async () => {
            mockStatement.all = vi.fn().mockReturnValue([]);

            const result = await repository.load();

            expect(Object.keys(result)).toContain('claude');
            expect(Object.keys(result)).toContain('cursor');
            expect(Object.keys(result)).toContain('codex');
        });

        it('should disable tools that do not support MCP by default', async () => {
            mockStatement.all = vi.fn().mockReturnValue([]);

            const result = await repository.load();

            expect(result.codex.enabled).toBe(false);
            expect(result.claude.enabled).toBe(true);
        });

        it('should set servers to null by default', async () => {
            mockStatement.all = vi.fn().mockReturnValue([]);

            const result = await repository.load();

            expect(result.claude.servers).toBeNull();
            expect(result.cursor.servers).toBeNull();
        });
    });
});
