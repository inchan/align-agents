
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
        TOOL_METADATA: mockMetadata,
    };
});

describe('MCP E2E', () => {
    let tempHome: string;
    const ORIGINAL_HOME = process.env.HOME;
    const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

    function setupHome(): string {
        const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-e2e-mcp-'));
        process.env.HOME = temp;
        process.env.USERPROFILE = temp;
        return temp;
    }

    function initTestDb(homeDir: string) {
        const dbPath = path.join(homeDir, '.acs', 'data.db');
        fs.mkdirSync(path.dirname(dbPath), { recursive: true });
        return new Database(dbPath);
    }

    function writeJson(filePath: string, data: any) {
        fs.mkdirSync(path.dirname(filePath), { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
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

    it('sync --all MCP 설정을 실제 툴 설정 파일에 반영', async () => {
        const claudeConfigPath = path.join(tempHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

        // Ensure config file exists
        writeJson(claudeConfigPath, { mcpServers: {} });

        // Seed Data
        const db = initTestDb(tempHome);
        const mcpSetId = 'test-mcp-set-id';
        const defId = 'def-1';
        factories.seedMcpData(db, mcpSetId, defId);
        factories.seedSyncConfig(db, {
            'claude-desktop': { enabled: true, servers: null }
        });
        factories.seedGlobalConfig(db, {
            masterDir: path.join(tempHome, '.config', 'ai-cli-syncer'),
            autoBackup: 'false'
        });

        const { syncCommand } = await import('../commands/sync.js');

        const program = new Command();
        program.exitOverride();
        program.addCommand(syncCommand);

        const claudeTool = {
            id: 'claude-desktop',
            name: 'Claude Desktop',
            configPath: claudeConfigPath,
            configPaths: [claudeConfigPath],
            mcpConfigPath: claudeConfigPath,
            exists: true,
            supportsMcp: true
        } as any;

        mockMetadata.push(claudeTool);
        scanForToolsMock.mockResolvedValue([claudeTool]);

        await program.parseAsync(['sync', '--all', '--strategy', 'overwrite', '--source', mcpSetId], { from: 'user' });

        const content = fs.readFileSync(claudeConfigPath, 'utf-8');
        const updated = JSON.parse(content);
        expect(updated.mcpServers.server1.command).toBe('node');
    });

    it('status 명령이 스캔/MCP/Rules 상태를 요약한다', async () => {
        const configDir = path.join(tempHome, '.ai-cli-syncer');
        const registryPath = path.join(configDir, 'registry.json');
        const toolConfigPath = path.join(configDir, 'claude.json');

        fs.mkdirSync(configDir, { recursive: true });

        // Seed Data
        const db = initTestDb(tempHome);
        const mcpSetId = 'status-test-set';
        factories.seedMcpData(db, mcpSetId, 'def-1');
        factories.seedSyncConfig(db, {
            'claude-desktop': { enabled: true, servers: null }
        });

        writeJson(registryPath, {
            tools: [{ id: 'claude-desktop', name: 'Claude Desktop', configPath: toolConfigPath, exists: true }],
            lastScan: new Date('2024-01-01T00:00:00Z').toISOString(),
        });
        fs.writeFileSync(toolConfigPath, '{}');

        const logs: string[] = [];
        const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
            logs.push(args.join(' '));
        });

        const { statusCommand } = await import('../commands/status.js');
        const program = new Command();
        program.exitOverride();
        program.addCommand(statusCommand);

        await program.parseAsync(['status'], { from: 'user' });

        logSpy.mockRestore();

        const output = logs.join('\n').replace(/\u001b\[[0-9;]*m/g, '');
        expect(output).toContain('설치된 도구: 1/1');
        expect(output).toContain('Master MCP 개념 제거됨');
        expect(output).toContain('동기화 활성화:');
        expect(output).toContain('claude-desktop');
        expect(output).toContain('Rules 동기화 상태');
    });
});
