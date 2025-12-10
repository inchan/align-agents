
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';
import Database from 'better-sqlite3';
import { resetDatabase } from '../infrastructure/database.js';
import { factories } from '../test-utils/factories.js';

// Setup Mock Helpers
const { scanForToolsMock, backupMock, mockMetadata } = vi.hoisted(() => ({
    scanForToolsMock: vi.fn(async (): Promise<any[]> => []),
    backupMock: {
        initBackupRepo: vi.fn(async () => { }),
        createBackup: vi.fn(async () => 'mock-commit'),
    },
    mockMetadata: [] as any[],
}));

vi.mock('../services/backup.js', () => backupMock);
vi.mock('../services/scanner.js', () => ({
    scanForTools: (...args: any[]) => (scanForToolsMock as any)(...args),
}));
vi.mock('inquirer', () => ({
    default: { prompt: vi.fn().mockResolvedValue({ overwrite: true }) },
}));
vi.mock('../constants/tools.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../constants/tools.js')>();
    return {
        ...actual,
        getToolMetadata: vi.fn((id) => mockMetadata.find(t => t.id === id) || actual.getToolMetadata(id)),
        getRulesCapableTools: vi.fn(() => mockMetadata),
        TOOL_METADATA: mockMetadata,
    };
});

describe('Rules E2E', () => {
    let tempHome: string;
    const ORIGINAL_HOME = process.env.HOME;
    const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

    function setupHome(): string {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-e2e-rules-'));
        process.env.HOME = temp;
        process.env.USERPROFILE = temp;
        return temp;
    }

    function initTestDb(homeDir: string) {
        const dbPath = path.join(homeDir, '.align-agents', 'data.db');
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        return new Database(dbPath);
    }

    beforeEach(() => {
        resetDatabase();
        tempHome = setupHome();
        vi.resetModules();
        mockMetadata.length = 0;
    });

    afterEach(() => {
        process.env.HOME = ORIGINAL_HOME;
        process.env.USERPROFILE = ORIGINAL_USERPROFILE;
        try {
            resetDatabase();
            fs.rmSync(tempHome, { recursive: true, force: true });
        } catch (e) { /* ignore */ }
    });

    it('rules sync --all 프로젝트 경로로 Rules 배포', async () => {
        const projectDir = path.join(tempHome, 'project');
        fs.mkdirSync(projectDir, { recursive: true });

        // Seed Data
        const db = initTestDb(tempHome);
        const ruleId = 'test-rule-id';
        factories.seedRulesData(db, ruleId);
        factories.seedSyncConfig(db, {});
        factories.seedGlobalConfig(db, {
            masterDir: path.join(tempHome, '.config', 'align-agents'),
            autoBackup: 'false'
        });

        const { rulesCommand } = await import('../commands/rules.js');
        const { getRulesCapableTools } = await import('../constants/tools.js');

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        // Setup Mock Metadata
        mockMetadata.push(
            { id: 'cursor-ide', name: 'Cursor', rulesFilename: '.cursorrules', configPaths: [], exists: false } as any,
            { id: 'windsurf-ide', name: 'Windsurf', rulesFilename: '.windsurfrules', configPaths: [], exists: false } as any,
            { id: 'claude-code-cli', name: 'Claude Code', rulesFilename: 'CLAUDE.md', configPaths: [], exists: false } as any
        );

        await program.parseAsync(
            ['rules', 'sync', '--all', '--project', projectDir, '--strategy', 'overwrite', '--source', ruleId],
            { from: 'user' }
        );

        const tools = getRulesCapableTools();
        for (const tool of tools) {
            const target = path.join(projectDir, tool.rulesFilename!);
            expect(fs.existsSync(target)).toBe(true);
            expect(fs.readFileSync(target, 'utf-8')).toContain('E2E Rules');
        }
    });

    it('sync --tool 옵션으로 특정 도구만 동기화한다', async () => {
        const projectDir = path.join(tempHome, 'project');
        fs.mkdirSync(projectDir, { recursive: true });

        const db = initTestDb(tempHome);
        const ruleId = 'tool-sync-rule';
        factories.seedRulesData(db, ruleId, '# Specific Tool Rules');
        factories.seedGlobalConfig(db, {
            masterDir: path.join(tempHome, '.config', 'align-agents')
        });

        const { rulesCommand } = await import('../commands/rules.js');
        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        await program.parseAsync(
            ['rules', 'sync', '--tool', 'claude-code-cli', '--project', projectDir, '--strategy', 'overwrite', '--source', ruleId],
            { from: 'user' }
        );

        expect(fs.existsSync(path.join(projectDir, 'CLAUDE.md'))).toBe(true);
        expect(fs.existsSync(path.join(projectDir, '.cursorrules'))).toBe(false);
    });

    it('sync --tool --global 옵션으로 특정 도구의 전역 설정을 동기화한다', async () => {
        const globalRulesDir = path.join(tempHome, '.claude');
        fs.mkdirSync(globalRulesDir, { recursive: true });

        const db = initTestDb(tempHome);
        const ruleId = 'global-sync-rule';
        factories.seedRulesData(db, ruleId, '# Global Tool Rules');
        factories.seedGlobalConfig(db, {
            masterDir: path.join(tempHome, '.config', 'align-agents')
        });

        const { rulesCommand } = await import('../commands/rules.js');
        const { getToolMetadata } = await import('../constants/tools.js');

        // Note: Mocking getToolMetadata implementation in this specific test might be tricky due to module hoisting/caching.
        // But our top-level mock uses mockMetadata array or falls back. 
        // We need to inject metadata that has 'globalRulesDir'.

        // Let's rely on the top-level mock logic:
        // getToolMetadata: vi.fn((id) => mockMetadata.find(...) || actual.getToolMetadata(id))

        mockMetadata.push({
            id: 'claude-code-cli',
            name: 'Claude Code CLI',
            rulesFilename: 'CLAUDE.md',
            globalRulesDir: globalRulesDir,
            configPaths: [],
            exists: true
        } as any);

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        await program.parseAsync(
            ['rules', 'sync', '--tool', 'claude-code-cli', '--global', '--strategy', 'overwrite', '--source', ruleId],
            { from: 'user' }
        );

        const target = path.join(globalRulesDir, 'CLAUDE.md');
        expect(fs.existsSync(target)).toBe(true);
        expect(fs.readFileSync(target, 'utf-8')).toContain('# Global Tool Rules');
    });

    it('sync --all 옵션으로 모든 도구의 전역 설정을 동기화한다', async () => {
        const claudeGlobalDir = path.join(tempHome, '.claude');
        fs.mkdirSync(claudeGlobalDir, { recursive: true });

        const db = initTestDb(tempHome);
        const ruleId = 'all-global-rule';
        factories.seedRulesData(db, ruleId, '# All Global Rules');
        factories.seedGlobalConfig(db, {
            masterDir: path.join(tempHome, '.config', 'align-agents')
        });

        const { rulesCommand } = await import('../commands/rules.js');

        mockMetadata.push({
            id: 'claude-code-cli',
            name: 'Claude Code CLI',
            rulesFilename: 'CLAUDE.md',
            globalRulesDir: claudeGlobalDir,
            exists: true
        } as any);

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        await program.parseAsync(
            ['rules', 'sync', '--all', '--strategy', 'overwrite', '--source', ruleId],
            { from: 'user' }
        );

        const claudeTarget = path.join(claudeGlobalDir, 'CLAUDE.md');
        expect(fs.existsSync(claudeTarget)).toBe(true);
        expect(fs.readFileSync(claudeTarget, 'utf-8')).toContain('# All Global Rules');
    });
});
