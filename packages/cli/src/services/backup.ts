import { simpleGit } from 'simple-git';
import { SyncService } from './impl/SyncService.js';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';
import fs from 'fs';
import path from 'path';

/**
 * 백업 저장소(Git)를 초기화한다.
 * 설정 디렉토리에 Git 저장소가 없으면 생성하고 .gitignore를 설정한다.
 * @throws Error - Git 초기화 실패 시
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
        await git.addConfig('user.name', 'align-agents');
        await git.addConfig('user.email', 'acs@local');

        // .gitignore 생성
        const gitignorePath = path.join(masterDir, '.gitignore');
        if (!fs.existsSync(gitignorePath)) {
            fs.writeFileSync(gitignorePath, 'node_modules\n.DS_Store\n');
        }
    }
}

/**
 * 현재 상태의 백업을 생성한다. (Git 커밋)
 * @param message - 커밋 메시지 (선택, 기본: 현재 시간)
 * @returns 생성된 커밋 해시
 * @throws Error - 변경사항이 없거나 커밋 실패 시
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
 * 백업 목록을 조회한다. (Git 로그)
 * @returns 백업 목록 (hash, fullHash, date, message)
 */
export async function getBackups(): Promise<Array<{ hash: string; fullHash?: string; date: string; message: string }>> {
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
 * 지정된 백업으로 복원한다. (Git hard reset)
 * 현재 변경사항이 있으면 stash 후 복원한다.
 * @param hash - 복원할 커밋 해시
 * @throws Error - 백업 저장소가 없거나 복원 실패 시
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
