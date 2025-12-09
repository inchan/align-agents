import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTimestampedBackup, listBackups, restoreLatestBackup } from '../backup.js';

// fs 모듈 모킹
vi.mock('fs');

// path 모듈 모킹
const mocks = vi.hoisted(() => ({
    dirname: vi.fn(),
    basename: vi.fn(),
    join: vi.fn(),
}));

vi.mock('path', async () => {
    const actual = await vi.importActual('path');
    return {
        ...actual,
        default: {
            ...actual,
            dirname: mocks.dirname,
            basename: mocks.basename,
            join: mocks.join,
        },
        dirname: mocks.dirname,
        basename: mocks.basename,
        join: mocks.join,
    };
});

describe('Backup Utils', () => {
    const mockFilePath = '/test/file.txt';
    const mockBackupDir = '/test/.backup';
    const mockDate = new Date('2025-11-28T12:00:00.000Z');

    beforeEach(() => {
        vi.resetAllMocks();
        vi.useFakeTimers();
        vi.setSystemTime(mockDate);

        // path 모킹 설정
        mocks.dirname.mockReturnValue('/test');
        mocks.basename.mockReturnValue('file.txt');
        mocks.join.mockImplementation((...args: string[]) => args.join('/'));
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('cleans old backups when exceeding max', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue([
            'file.txt.1',
            'file.txt.2',
            'file.txt.3',
        ] as any);
        vi.mocked(fs.statSync).mockReturnValue({ mtimeMs: 3 } as any);

        createTimestampedBackup(mockFilePath, { maxBackups: 2 });

        expect(fs.unlinkSync).toHaveBeenCalled();
    });

    it('restores latest backup', () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readdirSync).mockReturnValue(['file.txt.20251128-100000'] as any);
        vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date('2025-11-28T10:00:00Z'), size: 1 } as any);

        const restored = restoreLatestBackup(mockFilePath);

        expect(restored).toBe(true);
        expect(fs.copyFileSync).toHaveBeenCalled();
    });

    it('returns false when no backups exist to restore', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const restored = restoreLatestBackup(mockFilePath);

        expect(restored).toBe(false);
    });

    describe('createTimestampedBackup', () => {
        it('should create a backup file in .backup directory', () => {
            // Given
            vi.mocked(fs.existsSync).mockReturnValueOnce(true); // 원본 파일 존재
            vi.mocked(fs.existsSync).mockReturnValueOnce(false); // 백업 디렉토리 없음

            // When
            const result = createTimestampedBackup(mockFilePath);

            // Then
            expect(fs.mkdirSync).toHaveBeenCalledWith(mockBackupDir, { recursive: true });
            expect(fs.copyFileSync).toHaveBeenCalled();
            expect(result).toContain('.backup/file.txt.20251128-120000');
        });

        it('should return null if original file does not exist', () => {
            // Given
            vi.mocked(fs.existsSync).mockReturnValue(false);

            // When
            const result = createTimestampedBackup(mockFilePath);

            // Then
            expect(result).toBeNull();
            expect(fs.copyFileSync).not.toHaveBeenCalled();
        });

        it('should skip backup if skipBackup option is true', () => {
            // When
            const result = createTimestampedBackup(mockFilePath, { skipBackup: true });

            // Then
            expect(result).toBeNull();
            expect(fs.copyFileSync).not.toHaveBeenCalled();
        });
    });

    describe('listBackups', () => {
        it('should return list of backups sorted by date', () => {
            // Given
            vi.mocked(fs.existsSync).mockReturnValue(true);
            vi.mocked(fs.readdirSync).mockReturnValue([
                'file.txt.20251128-100000', // Oldest
                'file.txt.20251128-120000', // Newest
                'other.txt.20251128-110000' // Different file
            ] as any);

            const mockStat = (time: number) => ({
                mtime: new Date(time),
                size: 100
            });

            vi.mocked(fs.statSync).mockImplementation((p: any) => {
                if (p.includes('120000')) return mockStat(2000) as any;
                if (p.includes('100000')) return mockStat(1000) as any;
                return mockStat(0) as any;
            });

            // When
            const backups = listBackups(mockFilePath);

            // Then
            expect(backups).toHaveLength(2);
            expect(backups[0].path).toContain('120000'); // Newest first
            expect(backups[1].path).toContain('100000');
        });

        it('should return empty array if backup directory does not exist', () => {
            // Given
            vi.mocked(fs.existsSync).mockReturnValue(false);

            // When
            const backups = listBackups(mockFilePath);

            // Then
            expect(backups).toEqual([]);
        });
    });
});
