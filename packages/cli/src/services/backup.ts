import { simpleGit } from 'simple-git';
import { SyncService } from './impl/SyncService.js';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';
import fs from 'fs';
import path from 'path';

/**
 * 백업 저장소 초기화
 */
export async function initBackupRepo(): Promise<void> {
    const fsSystem = new NodeFileSystem();
    const syncService = new SyncService(fsSystem);
    const masterDir = await syncService.getMasterDir();

    // 마스터 디렉토리가 없으면 생성
    if (!fs.existsSync(masterDir)) {
        fs.mkdirSync(masterDir, { recursive: true });
    }

    const git = simpleGit(masterDir);

    if (!await git.checkIsRepo()) {
        await git.init();
        await git.addConfig('user.name', 'AI CLI Syncer');
        await git.addConfig('user.email', 'acs@local');

        // .gitignore 생성
        const gitignorePath = path.join(masterDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
            fs.writeFileSync(gitignorePath, 'node_modules\n.DS_Store\n');
        }
    }
}

/**
 * 백업 생성 (커밋)
 */
export async function createBackup(message?: string): Promise<string> {
    const fsSystem = new NodeFileSystem();
    const syncService = new SyncService(fsSystem);
    const masterDir = await syncService.getMasterDir();

    if (!fs.existsSync(masterDir)) {
        fs.mkdirSync(masterDir, { recursive: true });
    }

    const git = simpleGit(masterDir);

    await initBackupRepo();
    await git.add('.');

    const status = await git.status();
    if (status.files.length === 0) {
        throw new Error('변경 사항이 없어 백업할 내용이 없습니다.');
    }

    const summary = await git.commit(message || `Backup: ${new Date().toLocaleString()}`);
    return summary.commit;
}

/**
 * 백업 목록 조회
 */
export async function getBackups(): Promise<Array<{ hash: string; date: string; message: string }>> {
    const fsSystem = new NodeFileSystem();
    const syncService = new SyncService(fsSystem);
    const masterDir = await syncService.getMasterDir();

    if (!fs.existsSync(masterDir)) {
        return [];
    }

    const git = simpleGit(masterDir);

    if (!await git.checkIsRepo()) return [];

    try {
        const log = await git.log();
        return log.all.map((commit: any) => ({
            hash: commit.hash.substring(0, 7),
            fullHash: commit.hash,
            date: commit.date,
            message: commit.message
        }));
    } catch (error) {
        return [];
    }
}

/**
 * 백업 복원
 */
export async function restoreBackup(hash: string): Promise<void> {
    const fsSystem = new NodeFileSystem();
    const syncService = new SyncService(fsSystem);
    const masterDir = await syncService.getMasterDir();

    if (!fs.existsSync(masterDir)) {
        throw new Error('백업 저장소가 존재하지 않습니다.');
    }

    const git = simpleGit(masterDir);

    if (!await git.checkIsRepo()) {
        throw new Error('백업 저장소가 초기화되지 않았습니다.');
    }

    // 현재 변경사항이 있다면 stash
    const status = await git.status();
    if (status.files.length > 0) {
        await git.stash();
    }

    await git.reset(['--hard', hash]);
}
