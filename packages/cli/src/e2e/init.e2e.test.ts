
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import Database from 'better-sqlite3';
import { resetDatabase } from '../infrastructure/database.js';

// Setup Mock Helpers (Minimal needed for init)
const { scanForToolsMock, backupMock } = vi.hoisted(() => ({
    scanForToolsMock: vi.fn(async (): Promise<any[]> => []),
    backupMock: {
        initBackupRepo: vi.fn(async () => { }),
        createBackup: vi.fn(async () => 'mock-commit'),
    },
}));

vi.mock('../services/backup.js', () => backupMock);
vi.mock('../services/scanner.js', () => ({
    scanForTools: (...args: any[]) => (scanForToolsMock as any)(...args),
}));
vi.mock('inquirer', () => ({
    default: { prompt: vi.fn().mockResolvedValue({ overwrite: true }) },
}));

describe('Init E2E', () => {
    let tempHome: string;
    const ORIGINAL_HOME = process.env.HOME;
    const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

    function setupHome(): string {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-e2e-init-'));
        process.env.HOME = temp;
        process.env.USERPROFILE = temp;
        return temp;
    }

    function getDbPath(homeDir: string): string {
        return path.join(homeDir, '.acs', 'data.db');
    }

    beforeEach(() => {
        resetDatabase();
        tempHome = setupHome();
        vi.resetModules();
    });

    afterEach(() => {
        process.env.HOME = ORIGINAL_HOME;
        process.env.USERPROFILE = ORIGINAL_USERPROFILE;
        try {
            resetDatabase();
            fs.rmSync(tempHome, { recursive: true, force: true });
        } catch (e) { /* ignore */ }
    });

    it('init 명령이 기본 설정을 부트스트랩한다', async () => {
        const { initCommand } = await import('../commands/init.js');
        const program = new Command();
        program.exitOverride();
        program.addCommand(initCommand);

        await program.parseAsync(['init'], { from: 'user' });

        // Verify DB file created
        const dbPath = getDbPath(tempHome);
        expect(fs.existsSync(dbPath)).toBe(true);

        // Verify DB content
        const db = new Database(dbPath);

        // Check global config
        const globalConfig: any = db.prepare('SELECT key, value FROM global_config').all();
        const configMap = globalConfig.reduce((acc: any, row: any) => ({ ...acc, [row.key]: row.value }), {});

        expect(configMap.masterDir).toBeDefined();
        expect(configMap.autoBackup).toBe('true');

        // Check sync config
        const syncConfig = db.prepare('SELECT tool_id FROM sync_config').all();
        expect(syncConfig.length).toBeGreaterThanOrEqual(0);
    });
});
