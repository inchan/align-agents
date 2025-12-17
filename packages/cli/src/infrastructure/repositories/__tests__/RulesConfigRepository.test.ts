import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { RulesConfigRepository } from '../RulesConfigRepository.js';
import { IDatabase, IRunResult } from '../../../interfaces/IDatabase.js';
import { Rule } from '../../../interfaces/IRulesService.js';

// Mock dependencies
vi.mock('../../../constants/tools.js', () => ({
    getToolMetadata: vi.fn((id: string) => {
        const tools: Record<string, any> = {
            'claude': { name: 'Claude', rulesFilename: 'CLAUDE.md' },
            'cursor': { name: 'Cursor', rulesFilename: '.cursorrules' },
        };
        return tools[id] || null;
    }),
    getRulesCapableTools: vi.fn(() => [
        { id: 'claude', name: 'Claude', rulesFilename: 'CLAUDE.md' },
        { id: 'cursor', name: 'Cursor', rulesFilename: '.cursorrules' },
    ]),
}));

vi.mock('crypto', () => ({
    randomUUID: vi.fn(() => 'mock-uuid-1234'),
}));

type MockStatement = {
    get?: Mock<(...params: any[]) => any>;
    all?: Mock<(...params: any[]) => any[]>;
    run?: Mock<(...params: any[]) => IRunResult>;
};

type MockedDatabase = {
    prepare: Mock<(sql: string) => MockStatement>;
    transaction: Mock<(fn: () => any) => any>;
    exec: Mock<(sql: string) => void>;
    close: Mock<() => void>;
    open: boolean;
};

describe('RulesConfigRepository', () => {
    let repository: RulesConfigRepository;
    let mockDb: MockedDatabase;

    beforeEach(() => {
        vi.clearAllMocks();

        mockDb = {
            prepare: vi.fn(() => ({
                run: vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 1 }),
                get: vi.fn(),
                all: vi.fn().mockReturnValue([]),
            })),
            transaction: vi.fn((fn) => fn()),
            exec: vi.fn(),
            close: vi.fn(),
            open: true,
        };

        repository = new RulesConfigRepository(mockDb as unknown as IDatabase);
    });

    describe('load', () => {
        it('should load existing config from DB', async () => {
            const mockRows = [
                { tool_id: 'claude', enabled: 1, target_path: '', global: 1 },
            ];
            mockDb.prepare.mockReturnValueOnce({
                all: vi.fn().mockReturnValueOnce(mockRows)
            });

            const result = await repository.load();

            expect(result).toEqual({ claude: { enabled: true, targetPath: '', global: true } });
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT tool_id, enabled, target_path, global'));
        });

        it('should return empty object if DB returns no rows', async () => {
            mockDb.prepare.mockReturnValueOnce({
                all: vi.fn().mockReturnValueOnce([])
            });

            const result = await repository.load();

            expect(result).toEqual({});
        });

        it('should return empty object on DB error', async () => {
            mockDb.prepare.mockReturnValueOnce({
                all: vi.fn().mockImplementationOnce(() => {
                    throw new Error('DB error');
                })
            });

            const result = await repository.load();

            expect(result).toEqual({});
        });
    });

    describe('save', () => {
        it('should save valid config', async () => {
            const config = { claude: { enabled: true, targetPath: '/path', global: true } };

            // Mock the prepare and run methods for the DELETE and INSERT statements
            const mockRun = vi.fn();
            mockDb.prepare.mockImplementation((sql: string) => {
                return {
                    run: mockRun,
                };
            });

            await repository.save(config);

            expect(mockDb.transaction).toHaveBeenCalled();
            expect(mockDb.prepare).toHaveBeenCalledWith('DELETE FROM rules_config');
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO rules_config'));
            expect(mockRun).toHaveBeenCalledWith(
                'claude',
                1,
                '/path',
                1
            );
        });

        it('should throw error for unknown tool', async () => {
            const config = { unknown_tool: { enabled: true, targetPath: '', global: true } };

            await expect(repository.save(config)).rejects.toThrow('Unknown tool in rules-config: unknown_tool');
        });
    });

    describe('init', () => {
        it('should not reinitialize if config exists', async () => {
            mockDb.prepare.mockImplementation((sql: string) => {
                if (sql.includes('SELECT COUNT(*)')) {
                    return {
                        get: vi.fn().mockReturnValueOnce({ count: 1 }) // Config exists
                    };
                }
                return { run: vi.fn() };
            });

            await repository.init();

            // Expect no INSERT operations if config already exists
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'));
            const insertCall = mockDb.prepare.mock.calls.find((call: [string]) => call[0].includes('INSERT INTO rules_config'));
            expect(insertCall).toBeUndefined();
        });

        it('should create default config for all rules-capable tools if no config exists', async () => {
            mockDb.prepare.mockImplementation((sql: string) => {
                if (sql.includes('SELECT COUNT(*)')) {
                    return {
                        get: vi.fn().mockReturnValueOnce({ count: 0 }) // No config exists
                    };
                }
                return {
                    run: vi.fn(),
                };
            });

            await repository.init();

            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'));
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO rules_config'));
            const insertStmt = mockDb.prepare.mock.results.find(res => res.value.run)?.value;
            expect(insertStmt.run).toHaveBeenCalledWith('claude', 1, '', 1);
            expect(insertStmt.run).toHaveBeenCalledWith('cursor', 1, '', 1);
        });
    });

    describe('getRulesList', () => {
        it('should load existing rules list from DB', async () => {
            const mockRows = [
                { id: '1', name: 'Rule 1', content: 'content', is_active: 1, created_at: 'now', updated_at: 'now' }
            ];
            mockDb.prepare.mockReturnValueOnce({
                all: vi.fn().mockReturnValueOnce(mockRows)
            });

            const result = await repository.getRulesList();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Rule 1');
            expect(result[0].isActive).toBe(true);
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('ORDER BY order_index ASC, created_at DESC'));
        });

        it('should return empty array if DB returns no rules', async () => {
            mockDb.prepare.mockReturnValueOnce({
                all: vi.fn().mockReturnValueOnce([])
            });

            const result = await repository.getRulesList();

            expect(result).toEqual([]);
        });
    });

    describe('getRule', () => {
        it('should return rule by id', async () => {
            const mockRow = { id: '2', name: 'Rule 2', content: 'content 2', is_active: 0, created_at: 'now', updated_at: 'now' };
            mockDb.prepare.mockReturnValueOnce({
                get: vi.fn().mockReturnValueOnce(mockRow)
            });

            const result = await repository.getRule('2');

            expect(result?.name).toBe('Rule 2');
        });

        it('should return null if rule not found', async () => {
            mockDb.prepare.mockReturnValueOnce({
                get: vi.fn().mockReturnValueOnce(undefined)
            });

            const result = await repository.getRule('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('createRule', () => {
        it('should create new rule', async () => {
            const mockRun = vi.fn();
            // First call for MAX(order_index) (get), Second for INSERT (run)
            mockDb.prepare.mockImplementation((sql: string) => {
                if (sql.includes('SELECT MAX(order_index)')) {
                    return {
                        get: vi.fn().mockReturnValue({ maxIndex: 0 })
                    } as any;
                }
                return {
                    run: mockRun,
                } as any;
            });

            const result = await repository.createRule('New Rule', 'new content');

            expect(result.id).toBe('mock-uuid-1234');
            expect(result.name).toBe('New Rule');
            expect(result.content).toBe('new content');
            expect(result.isActive).toBe(true);
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO rules'));
        });
    });

    describe('updateRule', () => {
        it('should update existing rule', async () => {
            const existingRule = { id: '1', name: 'Rule 1', content: 'old content', isActive: false, createdAt: 'now', updatedAt: 'now' };

            mockDb.prepare.mockImplementation((sql: string) => {
                if (sql.includes('SELECT') && sql.includes('WHERE id = ?')) {
                    return {
                        get: vi.fn().mockReturnValueOnce({ ...existingRule, is_active: existingRule.isActive ? 1 : 0 })
                    };
                }
                return { run: vi.fn() };
            });

            const result = await repository.updateRule('1', 'new content', 'Updated Name');

            expect(result.content).toBe('new content');
            expect(result.name).toBe('Updated Name');
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE rules'));
        });

        it('should throw error if rule not found', async () => {
            mockDb.prepare.mockImplementation((sql: string) => {
                if (sql.includes('SELECT') && sql.includes('WHERE id = ?')) {
                    return {
                        get: vi.fn().mockReturnValueOnce(undefined)
                    };
                }
                return { run: vi.fn() };
            });

            await expect(repository.updateRule('nonexistent', 'content'))
                .rejects.toThrow('Rule not found: nonexistent');
        });
    });

    describe('deleteRule', () => {
        it('should soft delete rule by id', async () => {
            const mockRun = vi.fn().mockReturnValue({ changes: 1, lastInsertRowid: 0 });
            mockDb.prepare.mockReturnValueOnce({
                run: mockRun,
                get: vi.fn(),
                all: vi.fn(),
            });

            await repository.deleteRule('2');

            // Verify update to is_archived = 1 and is_active = 0
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('UPDATE rules'));
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('is_archived = 1'));
            expect(mockDb.prepare).toHaveBeenCalledWith(expect.stringContaining('is_active = 0'));

            // Verify arguments (timestamp, id)
            expect(mockRun).toHaveBeenCalledWith(expect.any(String), '2');
        });
    });

    describe('getActiveRule', () => {
        it('should return active rule', async () => {
            const mockRow = { id: '1', name: 'Active Rule', content: 'content', is_active: 1, created_at: '', updated_at: '' };
            mockDb.prepare.mockReturnValueOnce({
                get: vi.fn().mockReturnValueOnce(mockRow),
                run: vi.fn(),
                all: vi.fn(),
            });

            const result = await repository.getActiveRule();

            expect(result?.name).toBe('Active Rule');
            expect(result?.isActive).toBe(true);
        });

        it('should return null if no active rule', async () => {
            mockDb.prepare.mockReturnValueOnce({
                get: vi.fn().mockReturnValueOnce(undefined),
                run: vi.fn(),
                all: vi.fn(),
            });

            const result = await repository.getActiveRule();

            expect(result).toBeNull();
        });
    });
});
