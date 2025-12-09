import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { Command } from 'commander';

const ORIGINAL_HOME = process.env.HOME;
const ORIGINAL_USERPROFILE = process.env.USERPROFILE;

function setupHome(): string {
    const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-e2e-'));
    process.env.HOME = tempHome;
    process.env.USERPROFILE = tempHome;
    return tempHome;
}

function cleanupHome(tempHome: string) {
    process.env.HOME = ORIGINAL_HOME;
    process.env.USERPROFILE = ORIGINAL_USERPROFILE;
    fs.rmSync(tempHome, { recursive: true, force: true });
}

function writeJson(filePath: string, data: any) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

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
    // Also mock saveRegistry/saveTools if needed, but ToolRepository handles saving to file which we want real.
}));

vi.mock('inquirer', () => ({
    default: {
        prompt: vi.fn().mockResolvedValue({}),
    },
}));

vi.mock('../constants/tools.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../constants/tools.js')>();
    return {
        ...actual,
        getToolMetadata: vi.fn((id) => mockMetadata.find(t => t.id === id) || actual.getToolMetadata(id)),
        getRulesCapableTools: vi.fn(() => mockMetadata), // Simplification
        TOOL_METADATA: mockMetadata, // Key Fix: Export mutable mock array
    };
});



describe('acs CLI E2E', () => {
    let tempHome: string;

    beforeEach(() => {
        tempHome = setupHome();
        vi.resetModules();
        const defaultTools = [
            { id: 'demo', name: 'Demo Tool', configPath: '/tmp/demo.json', configPaths: ['/tmp/demo.json'], exists: true } as any,
        ];
        mockMetadata.length = 0;
        mockMetadata.push(...defaultTools);
        scanForToolsMock.mockResolvedValue(defaultTools);
    });

    afterEach(() => {
        cleanupHome(tempHome);
    });

    it('rules sync --all 프로젝트 경로로 Rules 배포', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');
        const projectDir = path.join(tempHome, 'project');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(path.join(masterDir, 'rules'), { recursive: true });
        fs.mkdirSync(projectDir, { recursive: true });

        // Create a rule using the repository format
        const ruleContent = '# E2E Rules\n- keep me';
        const ruleId = 'test-rule-id';
        writeJson(path.join(masterDir, 'rules', 'index.json'), {
            rules: [{
                id: ruleId,
                name: 'E2E Test Rule',
                content: ruleContent,
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }]
        });
        writeJson(globalConfigPath, { masterDir, autoBackup: false });
        writeJson(path.join(masterDir, 'rules-config.json'), {});
        writeJson(path.join(masterDir, 'sync-config.json'), {});

        const { rulesCommand } = await import('../commands/rules.js');
        const { getRulesCapableTools } = await import('../constants/tools.js');

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        // Setup mock metadata for rules capable tools
        mockMetadata.length = 0;
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

    it('sync --all MCP 설정을 실제 툴 설정 파일에 반영', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');
        const claudeConfigPath = path.join(tempHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(path.join(masterDir, 'mcp'), { recursive: true });
        fs.mkdirSync(path.dirname(claudeConfigPath), { recursive: true });

        writeJson(globalConfigPath, { masterDir, autoBackup: false });

        // Create MCP Set using repository format
        const mcpSetId = 'test-mcp-set-id';
        const defId = 'def-1';
        writeJson(path.join(masterDir, 'mcp', 'definitions.json'), {
            definitions: [{
                id: defId,
                name: 'server1',
                command: 'node',
                args: ['server.js'],
                env: {}
            }]
        });
        writeJson(path.join(masterDir, 'mcp', 'index.json'), {
            sets: [{
                id: mcpSetId,
                name: 'E2E Test Set',
                items: [{ serverId: defId, disabled: false }],
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }]
        });

        writeJson(path.join(masterDir, 'sync-config.json'), {
            'claude-desktop': { enabled: true, servers: null },
        });
        writeJson(claudeConfigPath, { mcpServers: {} });

        const { syncCommand } = await import('../commands/sync.js');

        const program = new Command();
        program.exitOverride();
        program.addCommand(syncCommand);

        const claudeTool = { id: 'claude-desktop', name: 'Claude Desktop', configPath: claudeConfigPath, configPaths: [claudeConfigPath], mcpConfigPath: claudeConfigPath, exists: true, supportsMcp: true } as any;
        mockMetadata.length = 0;
        mockMetadata.push(claudeTool);

        scanForToolsMock.mockResolvedValue([
            claudeTool,
        ]);

        await program.parseAsync(['sync', '--all', '--strategy', 'overwrite', '--source', mcpSetId], { from: 'user' });

        const content = fs.readFileSync(claudeConfigPath, 'utf-8');
        console.log('[DEBUG] Synced Config Content:', content);
        const updated = JSON.parse(content);
        expect(updated.mcpServers.server1.command).toBe('node');
    });

    it('init 명령이 기본 설정을 부트스트랩한다', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');

        const { initCommand } = await import('../commands/init.js');
        const program = new Command();
        program.exitOverride();
        program.addCommand(initCommand);

        await program.parseAsync(['init'], { from: 'user' });

        // Master files should NOT be created anymore
        expect(fs.existsSync(path.join(masterDir, 'master-mcp.json'))).toBe(false);
        expect(fs.existsSync(path.join(masterDir, 'master-rules.md'))).toBe(false);
        expect(fs.existsSync(path.join(masterDir, 'sync-config.json'))).toBe(true);

        const globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
        expect(globalConfig.masterDir).toBe(masterDir);
        expect(globalConfig.autoBackup).toBe(true);
    });

    it('status 명령이 스캔/MCP/Rules 상태를 요약한다', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const configDir = path.join(tempHome, '.ai-cli-syncer');
        const registryPath = path.join(configDir, 'registry.json');
        const toolConfigPath = path.join(configDir, 'claude.json');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(configDir, { recursive: true });

        writeJson(path.join(masterDir, 'master-mcp.json'), {
            mcpServers: { server1: { command: 'node', args: ['app.js'] } },
        });
        writeJson(path.join(masterDir, 'sync-config.json'), {
            'claude-desktop': { enabled: true, servers: null },
        });
        fs.writeFileSync(path.join(masterDir, 'master-rules.md'), '#'.repeat(150));
        writeJson(path.join(masterDir, 'rules-config.json'), {
            'claude-desktop': { enabled: true },
        });

        writeJson(registryPath, {
            tools: [{ id: 'claude-desktop', name: 'Claude Desktop', configPath: toolConfigPath, exists: true }],
            lastScan: new Date('2024-01-01T00:00:00Z').toISOString(),
        });
        fs.writeFileSync(toolConfigPath, '{}');
        fs.writeFileSync(`${toolConfigPath}.bak`, '{}');

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
        expect(output).toContain('마스터 MCP 서버: 1개');
        expect(output).toContain('동기화 활성화: 1개 도구');
        expect(output).toContain('마스터 Rules: 작성됨');
    });

    it('MCP CRUD: add, list, update, remove 명령으로 서버를 관리하고 동기화한다', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');
        const claudeConfigPath = path.join(tempHome, 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(path.dirname(claudeConfigPath), { recursive: true });

        writeJson(globalConfigPath, { masterDir, autoBackup: false });
        writeJson(path.join(masterDir, 'master-mcp.json'), { mcpServers: {} });
        writeJson(path.join(masterDir, 'sync-config.json'), {
            'claude-desktop': { enabled: true, servers: null },
        });
        writeJson(claudeConfigPath, { mcpServers: {} });

        const { mcpCommand } = await import('../commands/mcp.js');
        const { syncCommand } = await import('../commands/sync.js');

        const program = new Command();
        program.exitOverride();
        program.addCommand(mcpCommand);
        program.addCommand(syncCommand);

        const claudeTool = { id: 'claude-desktop', name: 'Claude Desktop', configPath: claudeConfigPath, configPaths: [claudeConfigPath], mcpConfigPath: claudeConfigPath, exists: true, supportsMcp: true } as any;
        mockMetadata.length = 0;
        mockMetadata.push(claudeTool);

        scanForToolsMock.mockResolvedValue([
            claudeTool,
        ]);

        const logs: string[] = [];
        const logSpy = vi.spyOn(console, 'log').mockImplementation((...args: any[]) => {
            logs.push(args.join(' '));
        });

        // 1. MCP 서버 추가 (Create)
        await program.parseAsync(
            ['mcp', 'add', 'test-server', '--command', 'echo', '--args', 'hello'],
            { from: 'user' }
        );

        const masterMcp = JSON.parse(fs.readFileSync(path.join(masterDir, 'master-mcp.json'), 'utf-8'));
        expect(masterMcp.mcpServers['test-server']).toBeDefined();
        expect(masterMcp.mcpServers['test-server'].command).toBe('echo');

        // 2. MCP 서버 목록 조회 (Read)
        await program.parseAsync(['mcp', 'list'], { from: 'user' });
        const listOutput = logs.join('\n');
        expect(listOutput).toContain('test-server');
        expect(listOutput).toContain('echo');

        // 3. MCP 서버 업데이트 (Update - 덮어쓰기)
        await program.parseAsync(
            ['mcp', 'add', 'test-server', '--command', 'node', '--args', 'server.js'],
            { from: 'user' }
        );
        const masterMcpUpdated = JSON.parse(fs.readFileSync(path.join(masterDir, 'master-mcp.json'), 'utf-8'));
        expect(masterMcpUpdated.mcpServers['test-server'].command).toBe('node');
        expect(masterMcpUpdated.mcpServers['test-server'].args).toEqual(['server.js']);

        // 4. 동기화
        await program.parseAsync(['sync', '--all', '--strategy', 'overwrite'], { from: 'user' });

        const claudeConfig = JSON.parse(fs.readFileSync(claudeConfigPath, 'utf-8'));
        expect(claudeConfig.mcpServers['test-server']).toBeDefined();
        expect(claudeConfig.mcpServers['test-server'].command).toBe('node');

        // 5. MCP 서버 삭제 (Delete)
        await program.parseAsync(['mcp', 'remove', 'test-server'], { from: 'user' });

        const masterMcpAfterRemove = JSON.parse(fs.readFileSync(path.join(masterDir, 'master-mcp.json'), 'utf-8'));
        expect(masterMcpAfterRemove.mcpServers['test-server']).toBeUndefined();

        logSpy.mockRestore();
    });

    it('sync --tool 옵션으로 특정 도구만 동기화한다', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');
        const projectDir = path.join(tempHome, 'project');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(projectDir, { recursive: true });

        writeJson(globalConfigPath, { masterDir, autoBackup: false });
        fs.writeFileSync(path.join(masterDir, 'master-rules.md'), '# Specific Tool Rules');
        writeJson(path.join(masterDir, 'rules-config.json'), {});

        const { rulesCommand } = await import('../commands/rules.js');

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        // 1. 특정 도구(claude-code-cli)만 동기화
        await program.parseAsync(
            ['rules', 'sync', '--tool', 'claude-code-cli', '--project', projectDir, '--strategy', 'overwrite'],
            { from: 'user' }
        );

        // CLAUDE.md는 존재해야 함
        expect(fs.existsSync(path.join(projectDir, 'CLAUDE.md'))).toBe(true);

        // 다른 도구 파일(예: .cursorrules)은 존재하지 않아야 함
        expect(fs.existsSync(path.join(projectDir, '.cursorrules'))).toBe(false);
    });

    it('sync --tool --global 옵션으로 특정 도구의 전역 설정을 동기화한다', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');
        const globalRulesDir = path.join(tempHome, '.claude');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(globalRulesDir, { recursive: true });

        writeJson(globalConfigPath, { masterDir, autoBackup: false });
        fs.writeFileSync(path.join(masterDir, 'master-rules.md'), '# Global Tool Rules');
        writeJson(path.join(masterDir, 'rules-config.json'), {});

        const { rulesCommand } = await import('../commands/rules.js');
        const { getToolMetadata } = await import('../constants/tools.js');

        // Mock getToolMetadata to return our temp global directory
        vi.mocked(getToolMetadata).mockImplementation((id) => {
            if (id === 'claude-code-cli') {
                return {
                    id: 'claude-code-cli',
                    name: 'Claude Code CLI',
                    rulesFilename: 'CLAUDE.md',
                    globalRulesDir: globalRulesDir,
                    configPaths: [],
                } as any;
            }
            return null;
        });

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        // 1. 특정 도구 전역 동기화
        await program.parseAsync(
            ['rules', 'sync', '--tool', 'claude-code-cli', '--global', '--strategy', 'overwrite'],
            { from: 'user' }
        );

        // 전역 디렉토리에 파일이 생성되었는지 확인
        const target = path.join(globalRulesDir, 'CLAUDE.md');
        expect(fs.existsSync(target)).toBe(true);
        expect(fs.readFileSync(target, 'utf-8')).toContain('# Global Tool Rules');
    });

    it('sync --all 옵션으로 모든 도구의 전역 설정을 동기화한다', async () => {
        const masterDir = path.join(tempHome, '.config', 'ai-cli-syncer');
        const globalConfigPath = path.join(tempHome, '.ai-cli-syncer', 'config.json');
        const claudeGlobalDir = path.join(tempHome, '.claude');

        fs.mkdirSync(masterDir, { recursive: true });
        fs.mkdirSync(claudeGlobalDir, { recursive: true });

        writeJson(globalConfigPath, { masterDir, autoBackup: false });
        fs.writeFileSync(path.join(masterDir, 'master-rules.md'), '# All Global Rules');
        writeJson(path.join(masterDir, 'rules-config.json'), {});

        const { rulesCommand } = await import('../commands/rules.js');
        const { getToolMetadata, getRulesCapableTools } = await import('../constants/tools.js');

        // Mock getRulesCapableTools and getToolMetadata
        vi.mocked(getRulesCapableTools).mockReturnValue([
            { id: 'claude-code-cli', name: 'Claude Code CLI', rulesFilename: 'CLAUDE.md', globalRulesDir: claudeGlobalDir } as any,
        ]);

        vi.mocked(getToolMetadata).mockImplementation((id) => {
            if (id === 'claude-code-cli') {
                return { id, name: 'Claude Code CLI', rulesFilename: 'CLAUDE.md', globalRulesDir: claudeGlobalDir, configPaths: [] } as any;
            }
            return null;
        });

        const program = new Command();
        program.exitOverride();
        program.addCommand(rulesCommand);

        // 1. 전체 도구 전역 동기화 (--all만 사용하면 전역이 기본값)
        await program.parseAsync(
            ['rules', 'sync', '--all', '--strategy', 'overwrite'],
            { from: 'user' }
        );

        // Claude 전역 파일 확인
        const claudeTarget = path.join(claudeGlobalDir, 'CLAUDE.md');
        expect(fs.existsSync(claudeTarget)).toBe(true);
        expect(fs.readFileSync(claudeTarget, 'utf-8')).toContain('# All Global Rules');
    });
});
