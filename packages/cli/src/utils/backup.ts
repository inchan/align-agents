import fs from 'fs';
import path from 'path';

export interface BackupOptions {
    maxBackups?: number; // 유지할 최대 백업 개수 (기본값: 5)
    skipBackup?: boolean; // 백업 생성 건너뛰기
}

/**
 * 파일을 타임스탬프 기반으로 백업합니다.
 * 
 * @param filePath 백업할 파일 경로
 * @param options 백업 옵션
 * @returns 생성된 백업 파일 경로 (백업하지 않은 경우 null)
 */
export function createTimestampedBackup(filePath: string, options: BackupOptions = {}): string | null {
    const { maxBackups = 5, skipBackup = false } = options;

    // 백업 건너뛰기
    if (skipBackup) {
        return null;
    }

    // 파일이 존재하지 않으면 백업 불필요
    if (!fs.existsSync(filePath)) {
        return null;
    }

    // 타임스탬프 생성 (YYYYMMDD-HHMMSS)
    const now = new Date();
    const timestamp = now.toISOString()
        .replace(/[-:]/g, '')
        .replace('T', '-')
        .split('.')[0];

    // .backup 디렉토리 생성
    const dir = path.dirname(filePath);
    const backupDir = path.join(dir, '.backup');
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // 백업 파일명 생성
    const basename = path.basename(filePath);
    const backupPath = path.join(backupDir, `${basename}.${timestamp}`);

    // 백업 생성
    fs.copyFileSync(filePath, backupPath);

    // 오래된 백업 정리
    cleanOldBackups(filePath, maxBackups);

    return backupPath;
}

/**
 * 오래된 백업 파일들을 정리합니다.
 * 
 * @param originalPath 원본 파일 경로
 * @param maxBackups 유지할 최대 백업 개수
 */
function cleanOldBackups(originalPath: string, maxBackups: number): void {
    const dir = path.dirname(originalPath);
    const backupDir = path.join(dir, '.backup');
    const basename = path.basename(originalPath);

    if (!fs.existsSync(backupDir)) {
        return;
    }

    // 해당 파일의 모든 백업 찾기
    const backupPattern = `${basename}.`;
    const files = fs.readdirSync(backupDir);

    const backups = files
        .filter(f => f.startsWith(backupPattern))
        .map(f => ({
            name: f,
            path: path.join(backupDir, f),
            stat: fs.statSync(path.join(backupDir, f))
        }))
        .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs); // 최신순 정렬

    // 최대 개수를 초과하는 백업 삭제
    if (backups.length > maxBackups) {
        const toDelete = backups.slice(maxBackups);
        toDelete.forEach(backup => {
            fs.unlinkSync(backup.path);
        });
    }
}

/**
 * 특정 파일의 모든 백업 목록을 반환합니다.
 * 
 * @param filePath 원본 파일 경로
 * @returns 백업 파일 정보 배열 (최신순)
 */
export function listBackups(filePath: string): Array<{ path: string; timestamp: Date; size: number }> {
    const dir = path.dirname(filePath);
    const backupDir = path.join(dir, '.backup');
    const basename = path.basename(filePath);

    if (!fs.existsSync(backupDir)) {
        return [];
    }

    const backupPattern = `${basename}.`;
    const files = fs.readdirSync(backupDir);

    return files
        .filter(f => f.startsWith(backupPattern))
        .map(f => {
            const fullPath = path.join(backupDir, f);
            const stat = fs.statSync(fullPath);
            return {
                path: fullPath,
                timestamp: stat.mtime,
                size: stat.size
            };
        })
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * 가장 최근 백업으로 복원합니다.
 * 
 * @param filePath 복원할 파일 경로
 * @returns 복원 성공 여부
 */
export function restoreLatestBackup(filePath: string): boolean {
    const backups = listBackups(filePath);

    if (backups.length === 0) {
        return false;
    }

    const latestBackup = backups[0];
    fs.copyFileSync(latestBackup.path, filePath);

    return true;
}
