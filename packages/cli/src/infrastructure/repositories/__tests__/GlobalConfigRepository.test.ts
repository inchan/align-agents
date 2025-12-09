import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GlobalConfigRepository } from '../GlobalConfigRepository.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';
import { GlobalConfig } from '../../../interfaces/ISyncService.js';

describe('GlobalConfigRepository', () => {
    let repository: GlobalConfigRepository;
    let mockFs: IFileSystem;
    const defaultConfig: GlobalConfig = { masterDir: '/default/master', autoBackup: true };

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

        repository = new GlobalConfigRepository(
            mockFs,
            '/config/dir',
            '/legacy/config.json',
            defaultConfig
        );
    });

    describe('init', () => {
        it('should not reinitialize if config exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);

            repository.init();

            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });

        it('should create default config if not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            repository.init();

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                '/config/dir/config.json',
                expect.stringContaining('/default/master')
            );
        });
    });

    describe('load', () => {
        it('should load existing config file', () => {
            const mockConfig = { masterDir: '/custom/path', autoBackup: false };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result.masterDir).toBe('/custom/path');
            expect(result.autoBackup).toBe(false);
        });

        it('should return default config if file does not exist and no legacy', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = repository.load();

            expect(result).toEqual(defaultConfig);
        });

        it('should migrate legacy config if exists', () => {
            mockFs.exists = vi.fn()
                .mockReturnValueOnce(false)  // new config
                .mockReturnValueOnce(true);  // legacy config

            const legacyConfig = { masterDir: '/legacy/path', autoBackup: false };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(legacyConfig));

            const result = repository.load();

            expect(result.masterDir).toBe('/legacy/path');
            expect(mockFs.writeFile).toHaveBeenCalled(); // Migration
        });

        it('should return default on parse error', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('invalid json');

            const result = repository.load();

            expect(result).toEqual(defaultConfig);
        });

        it('should return default on legacy migration failure', () => {
            mockFs.exists = vi.fn()
                .mockReturnValueOnce(false)
                .mockReturnValueOnce(true);

            mockFs.readFile = vi.fn().mockReturnValue('invalid');

            const result = repository.load();

            expect(result).toEqual(defaultConfig);
        });
    });

    describe('save', () => {
        it('should save valid config', () => {
            const config = { masterDir: '/new/path', autoBackup: true };

            repository.save(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                '/config/dir/config.json',
                expect.stringContaining('/new/path')
            );
        });

        it('should create directory if not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            repository.save({ masterDir: '/path', autoBackup: true });

            expect(mockFs.mkdir).toHaveBeenCalledWith('/config/dir');
        });

        it('should throw error for invalid config (empty masterDir)', () => {
            expect(() => repository.save({ masterDir: '', autoBackup: true }))
                .toThrow();
        });

        it('should validate config with Zod schema', () => {
            // Valid config should not throw
            expect(() => repository.save({ masterDir: '/valid/path', autoBackup: false }))
                .not.toThrow();
        });
    });
});
