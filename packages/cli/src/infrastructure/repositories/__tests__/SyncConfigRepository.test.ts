import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SyncConfigRepository } from '../SyncConfigRepository.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';

type MockedFileSystem = {
    [K in keyof IFileSystem]: Mock;
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

        repository = new SyncConfigRepository(mockFs as IFileSystem, '/mock/master');
    });

    describe('load', () => {
        it('should load existing sync config', () => {
            const mockConfig = { claude: { enabled: true, servers: ['server1'] } };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result.claude.enabled).toBe(true);
            expect(result.claude.servers).toEqual(['server1']);
        });

        it('should return default config if file does not exist', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = repository.load();

            expect(result).toHaveProperty('claude');
            expect(result).toHaveProperty('cursor');
            expect(result).toHaveProperty('codex');
            expect(result.claude.enabled).toBe(true);
            expect(result.codex.enabled).toBe(false); // supportsMcp = false
        });

        it('should return default config on parse error', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('invalid json');

            const result = repository.load();

            expect(result).toHaveProperty('claude');
            expect(result).toHaveProperty('cursor');
        });

        it('should normalize legacy config format with tools wrapper', () => {
            const legacyConfig = {
                tools: {
                    claude: { enabled: true, servers: ['s1', 's2'] }
                }
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(legacyConfig));

            const result = repository.load();

            expect(result.claude.enabled).toBe(true);
            expect(result.claude.servers).toEqual(['s1', 's2']);
        });

        it('should filter non-string values from servers array', () => {
            const mockConfig = {
                claude: { enabled: true, servers: ['valid', 123, null, 'also-valid'] }
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result.claude.servers).toEqual(['valid', 'also-valid']);
        });

        it('should handle null servers', () => {
            const mockConfig = { claude: { enabled: true, servers: null } };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result.claude.servers).toBeNull();
        });

        it('should default enabled to true if not specified', () => {
            const mockConfig = { claude: { servers: ['s1'] } };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result.claude.enabled).toBe(true);
        });

        it('should skip invalid tool entries', () => {
            const mockConfig = {
                claude: 'invalid-not-object',
                cursor: { enabled: true, servers: null }
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result.cursor.enabled).toBe(true);
            // claude should have default value since it was invalid
            expect(result.claude.enabled).toBe(true);
        });
    });

    describe('save', () => {
        it('should save valid config', () => {
            const config = { claude: { enabled: true, servers: null } };

            repository.save(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                '/mock/master/sync-config.json',
                expect.stringContaining('"claude"')
            );
        });

        it('should create directory if not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            repository.save({ claude: { enabled: true, servers: null } });

            expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/master');
        });

        it('should throw error for unknown tool', () => {
            const config = { unknown_tool: { enabled: true, servers: null } };

            expect(() => repository.save(config)).toThrow('Unknown tool in sync-config');
        });

        it('should save config with servers array', () => {
            const config = { claude: { enabled: true, servers: ['server1', 'server2'] } };

            repository.save(config);

            const writeCall = mockFs.writeFile.mock.calls[0] as [string, string];
            const writtenConfig = JSON.parse(writeCall[1]);

            expect(writtenConfig.claude.servers).toEqual(['server1', 'server2']);
        });

        it('should save config with disabled tool', () => {
            const config = { claude: { enabled: false, servers: null } };

            repository.save(config);

            const writeCall = mockFs.writeFile.mock.calls[0] as [string, string];
            const writtenConfig = JSON.parse(writeCall[1]);

            expect(writtenConfig.claude.enabled).toBe(false);
        });

        it('should validate config with Zod schema', () => {
            // Valid config should not throw
            expect(() => repository.save({
                claude: { enabled: true, servers: null },
                cursor: { enabled: false, servers: ['s1'] }
            })).not.toThrow();
        });
    });

    describe('default config generation', () => {
        it('should generate default config for all known tools', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = repository.load();

            expect(Object.keys(result)).toContain('claude');
            expect(Object.keys(result)).toContain('cursor');
            expect(Object.keys(result)).toContain('codex');
        });

        it('should disable tools that do not support MCP by default', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = repository.load();

            expect(result.codex.enabled).toBe(false);
            expect(result.claude.enabled).toBe(true);
        });

        it('should set servers to null by default', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = repository.load();

            expect(result.claude.servers).toBeNull();
            expect(result.cursor.servers).toBeNull();
        });
    });
});
