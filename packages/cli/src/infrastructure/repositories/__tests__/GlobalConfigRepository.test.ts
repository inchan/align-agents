import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { GlobalConfigRepository } from '../GlobalConfigRepository.js';
import { IDatabase, IRunResult } from '../../../interfaces/IDatabase.js';
import { GlobalConfig } from '../../../interfaces/ISyncService.js';

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

describe('GlobalConfigRepository', () => {
    let repository: GlobalConfigRepository;
    let mockDb: MockDatabase;
    let mockStatement: MockStatement;
    const defaultConfig: GlobalConfig = { masterDir: '/default/master', autoBackup: true };

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

        repository = new GlobalConfigRepository(
            mockDb as unknown as IDatabase,
            defaultConfig
        );
    });

    describe('init', () => {
        it('should not reinitialize if config exists', async () => {
            mockStatement.get = vi.fn().mockReturnValue({ count: 1 });

            await repository.init();

            // prepare called for SELECT COUNT, but no INSERT
            expect(mockDb.prepare).toHaveBeenCalledTimes(1);
            expect(mockDb.transaction).not.toHaveBeenCalled();
        });

        it('should create default config if not exists', async () => {
            mockStatement.get = vi.fn().mockReturnValue({ count: 0 });

            await repository.init();

            // Should call transaction for saving default config
            expect(mockDb.transaction).toHaveBeenCalled();
        });
    });

    describe('load', () => {
        it('should load existing config from database', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { key: 'masterDir', value: '/custom/path' },
                { key: 'autoBackup', value: 'false' },
            ]);

            const result = await repository.load();

            expect(result.masterDir).toBe('/custom/path');
            expect(result.autoBackup).toBe(false);
        });

        it('should return default config if table is empty', async () => {
            mockStatement.all = vi.fn().mockReturnValue([]);

            const result = await repository.load();

            expect(result).toEqual(defaultConfig);
        });

        it('should parse boolean values correctly', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { key: 'masterDir', value: '/path' },
                { key: 'autoBackup', value: 'true' },
            ]);

            const result = await repository.load();

            expect(result.autoBackup).toBe(true);
        });

        it('should parse numeric values correctly', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { key: 'masterDir', value: '/path' },
                { key: 'autoBackup', value: 'false' },
                { key: 'someNumber', value: '42' },
            ]);

            const result = await repository.load();

            expect((result as any).someNumber).toBe(42);
        });

        it('should merge with defaults to ensure all keys exist', async () => {
            mockStatement.all = vi.fn().mockReturnValue([
                { key: 'masterDir', value: '/custom' },
            ]);

            const result = await repository.load();

            expect(result.masterDir).toBe('/custom');
            expect(result.autoBackup).toBe(true); // From default
        });

        it('should return default config on database error', async () => {
            mockStatement.all = vi.fn().mockImplementation(() => {
                throw new Error('DB Error');
            });

            const result = await repository.load();

            expect(result).toEqual(defaultConfig);
        });
    });

    describe('save', () => {
        it('should save valid config to database', async () => {
            const config = { masterDir: '/new/path', autoBackup: true };

            await repository.save(config);

            expect(mockDb.transaction).toHaveBeenCalled();
            // DELETE + INSERT for each key
            expect(mockStatement.run).toHaveBeenCalled();
        });

        it('should clear existing config before saving', async () => {
            const config = { masterDir: '/path', autoBackup: true };

            await repository.save(config);

            // Verify DELETE was called
            const prepareCalls = mockDb.prepare.mock.calls.map(c => c[0]);
            expect(prepareCalls.some(sql => sql.includes('DELETE'))).toBe(true);
        });

        it('should save each config key as separate row', async () => {
            const config = { masterDir: '/path', autoBackup: false };

            await repository.save(config);

            // INSERT should be called for each key
            expect(mockStatement.run.mock.calls.length).toBeGreaterThanOrEqual(2);
        });

        it('should throw error for invalid config (empty masterDir)', async () => {
            await expect(repository.save({ masterDir: '', autoBackup: true }))
                .rejects.toThrow();
        });

        it('should validate config with Zod schema', async () => {
            // Valid config should not throw
            await expect(repository.save({ masterDir: '/valid/path', autoBackup: false }))
                .resolves.not.toThrow();
        });
    });
});
