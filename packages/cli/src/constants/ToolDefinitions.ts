import os from 'os';
import path from 'path';

export interface ToolMetadata {
    id: string;
    name: string;
    category: 'desktop' | 'cli' | 'ide';
    configPaths: string[];
    format: 'json' | 'toml';
    supportsMcp: boolean;
    rulesFilename?: string;
    globalRulesDir?: string;
    appPath?: string;
    cliCommand?: string;
    mcpConfigPath?: string;
}

export const TOOL_METADATA: ToolMetadata[] = [
    // Desktop Tools
    {
        id: 'claude-desktop',
        name: 'Claude Desktop',
        category: 'desktop',
        configPaths: [
            path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
            path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
        ],
        // Claude Desktop uses the same config file for settings and MCP
        mcpConfigPath: process.platform === 'darwin'
            ? path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json')
            : path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
        format: 'json',
        supportsMcp: true,
        appPath: '/Applications/Claude.app',
    },

    // CLI Tools
    {
        id: 'github-copilot-cli',
        name: 'GitHub Copilot',
        category: 'cli',
        configPaths: [
            path.join(os.homedir(), '.config/github-copilot/hosts.json'),
            path.join(os.homedir(), '.config/github-copilot/config.json'),
        ],
        format: 'json',
        supportsMcp: false,
        cliCommand: 'github-copilot-cli',
    },
    {
        id: 'codex',
        name: 'Codex',
        category: 'cli',
        configPaths: [
            path.join(os.homedir(), '.codex/config.toml'),
            path.join(os.homedir(), '.codex/config.json'),
        ],
        mcpConfigPath: path.join(os.homedir(), '.codex/config.toml'),
        format: 'toml',
        supportsMcp: true,
        rulesFilename: 'AGENTS.md',
        globalRulesDir: path.join(os.homedir(), '.codex'),
        cliCommand: 'codex',
    },
    {
        id: 'gemini-cli',
        name: 'Gemini CLI',
        category: 'cli',
        configPaths: [
            path.join(os.homedir(), '.gemini/settings.json'),
            path.join(os.homedir(), 'AppData/Roaming/gemini-cli/settings.json'),
        ],
        mcpConfigPath: path.join(os.homedir(), '.gemini/settings.json'),
        format: 'json',
        supportsMcp: true,
        rulesFilename: 'GEMINI.md',
        globalRulesDir: path.join(os.homedir(), '.gemini'),
        cliCommand: 'gemini',
    },
    {
        id: 'claude-code-cli',
        name: 'Claude Code',
        category: 'cli',
        configPaths: [
            path.join(os.homedir(), '.claude.json'),
            path.join(os.homedir(), '.claude/settings.json'),
        ],
        mcpConfigPath: path.join(os.homedir(), '.claude.json'),
        format: 'json',
        supportsMcp: true,
        rulesFilename: 'CLAUDE.md',
        globalRulesDir: path.join(os.homedir(), '.claude'),
        cliCommand: 'claude',
    },
    {
        id: 'qwen-cli',
        name: 'Qwen',
        category: 'cli',
        configPaths: [
            path.join(os.homedir(), '.qwen/settings.json'),
            path.join(os.homedir(), '.qwen/oauth_creds.json'),
        ],
        mcpConfigPath: path.join(os.homedir(), '.qwen/settings.json'),
        format: 'json',
        supportsMcp: true,
        cliCommand: 'qwen',
    },

    // IDE Tools
    {
        id: 'cursor-ide',
        name: 'Cursor',
        category: 'ide',
        configPaths: [
            path.join(os.homedir(), '.cursor/cli-config.json'),
            path.join(os.homedir(), 'Library/Application Support/Cursor/User/globalStorage/storage.json'),
        ],
        mcpConfigPath: path.join(os.homedir(), '.cursor/mcp.json'),
        format: 'json',
        supportsMcp: true,
        rulesFilename: '.cursorrules',
        globalRulesDir: os.homedir(),
        appPath: '/Applications/Cursor.app',
        cliCommand: 'cursor',
    },
    {
        id: 'windsurf-ide',
        name: 'Windsurf',
        category: 'ide',
        configPaths: [
            path.join(os.homedir(), '.codeium/windsurf/settings.json'),
        ],
        mcpConfigPath: path.join(os.homedir(), '.codeium/windsurf/mcp_config.json'),
        format: 'json',
        supportsMcp: true,
        appPath: '/Applications/Windsurf.app',
        cliCommand: 'windsurf',
        rulesFilename: '.windsurfrules',
        globalRulesDir: os.homedir(),
    },
];

export const DEFAULT_TOOLS: ToolMetadata[] = [...TOOL_METADATA];
