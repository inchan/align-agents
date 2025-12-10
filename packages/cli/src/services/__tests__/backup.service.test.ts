import fs from 'fs';
import path from 'path';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initBackupRepo, createBackup, getBackups, restoreBackup } from '../backup.js';
import { SyncService } from '../impl/SyncService.js';

const mocks = vi.hoisted(() => ({
    getMasterDir: vi.fn()
}));

vi.mock('../impl/SyncService.js', () => ({
    SyncService: vi.fn(function() {
        return {
            getMasterDir: mocks.getMasterDir
        };
    })
}));

let mockedMasterDir: string;

const gitMocks = {
    checkIsRepo: vi.fn(),
    init: vi.fn(),
    addConfig: vi.fn(),
    add: vi.fn(),
    status: vi.fn(),
    commit: vi.fn(),
    log: vi.fn(),
    stash: vi.fn(),
    reset: vi.fn(),
};

vi.mock('simple-git', () => ({
    simpleGit: vi.fn(() => gitMocks),
}));

describe('backup service adapter', () => {
    beforeEach(() => {
        mockedMasterDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-backup-'));
        Object.values(gitMocks).forEach(fn => fn.mockReset());
        mocks.getMasterDir.mockResolvedValue(mockedMasterDir);
    });

    afterEach(() => {
        fs.rmSync(mockedMasterDir, { recursive: true, force: true });
    });

    it('initBackupRepo initializes git repo and writes .gitignore', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(false);
        await initBackupRepo();

        expect(gitMocks.init).toHaveBeenCalled();
        expect(gitMocks.addConfig).toHaveBeenCalledWith('user.name', 'AI CLI Syncer');
        const gitignorePath = path.join(mockedMasterDir, '.gitignore');
        expect(fs.existsSync(gitignorePath)).toBe(true);
    });

    it('initBackupRepo creates master dir when missing', async () => {
        fs.rmSync(mockedMasterDir, { recursive: true, force: true });
        gitMocks.checkIsRepo.mockResolvedValue(true);
        await initBackupRepo();
        expect(fs.existsSync(mockedMasterDir)).toBe(true);
    });

    it('initBackupRepo keeps existing gitignore untouched', async () => {
        const gitignorePath = path.join(mockedMasterDir, '.gitignore');
        fs.writeFileSync(gitignorePath, 'custom');
        gitMocks.checkIsRepo.mockResolvedValue(false);
        await initBackupRepo();
        expect(fs.readFileSync(gitignorePath, 'utf-8')).toBe('custom');
    });

    it('createBackup commits when changes exist', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.status.mockResolvedValue({ files: ['a'] });
        gitMocks.commit.mockResolvedValue({ commit: 'abc123' });

        const commitHash = await createBackup('msg');

        expect(gitMocks.add).toHaveBeenCalledWith('.');
        expect(gitMocks.commit).toHaveBeenCalledWith('msg');
        expect(commitHash).toBe('abc123');
    });

    it('createBackup throws when no changes', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.status.mockResolvedValue({ files: [] });
        await expect(createBackup()).rejects.toThrow('변경 사항이 없어 백업할 내용이 없습니다.');
    });

    it('createBackup uses default message when not provided', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.status.mockResolvedValue({ files: ['x'] });
        gitMocks.commit.mockResolvedValue({ commit: 'auto' });
        const result = await createBackup();
        expect(result).toBe('auto');
    });

    it('creates master dir when missing during init/create', async () => {
        mockedMasterDir = path.join(os.tmpdir(), `acs-missing-${Date.now()}`);
        mocks.getMasterDir.mockResolvedValue(mockedMasterDir);
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.status.mockResolvedValue({ files: ['x'] });
        gitMocks.commit.mockResolvedValue({ commit: 'hash' });

        await createBackup('msg');
        expect(fs.existsSync(mockedMasterDir)).toBe(true);
    });

    it('getBackups returns parsed log entries', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.log.mockResolvedValue({
            all: [{ hash: 'abcdef123', date: '2024-01-01', message: 'msg' }],
        });

        const backups = await getBackups();
        expect(backups).toEqual([
            { hash: 'abcdef1', fullHash: 'abcdef123', date: '2024-01-01', message: 'msg' },
        ]);
    });

    it('getBackups returns [] when dir missing or log fails', async () => {
        fs.rmSync(mockedMasterDir, { recursive: true, force: true });
        expect(await getBackups()).toEqual([]);

        mockedMasterDir = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-backup-'));
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.log.mockRejectedValue(new Error('boom'));
        const backups = await getBackups();
        expect(backups).toEqual([]);
    });

    it('getBackups returns [] when not a repo', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(false);
        const result = await getBackups();
        expect(result).toEqual([]);
    });

    it('restoreBackup stashes changes and hard resets', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.status.mockResolvedValue({ files: ['file'] });

        await restoreBackup('deadbeef');

        expect(gitMocks.stash).toHaveBeenCalled();
        expect(gitMocks.reset).toHaveBeenCalledWith(['--hard', 'deadbeef']);
    });

    it('restoreBackup throws when repo missing', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(false);
        await expect(restoreBackup('hash')).rejects.toThrow('백업 저장소가 초기화되지 않았습니다.');
    });

    it('restoreBackup throws when master dir missing', async () => {
        fs.rmSync(mockedMasterDir, { recursive: true, force: true });
        await expect(restoreBackup('hash')).rejects.toThrow('백업 저장소가 존재하지 않습니다.');
    });

    it('restoreBackup skips stash when clean', async () => {
        gitMocks.checkIsRepo.mockResolvedValue(true);
        gitMocks.status.mockResolvedValue({ files: [] });

        await restoreBackup('hash');

        expect(gitMocks.stash).not.toHaveBeenCalled();
        expect(gitMocks.reset).toHaveBeenCalledWith(['--hard', 'hash']);
    });
});
