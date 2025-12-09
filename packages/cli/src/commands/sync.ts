import { Command } from 'commander';
import chalk from 'chalk';
import path from 'path';
import os from 'os';
import { syncToolMcp, syncAllTools, loadSyncConfig, type SyncResultStatus } from '../services/sync.js';
import { scanForTools } from '../services/scanner.js';
import { getToolMetadata } from '../constants/tools.js';

export const syncCommand = new Command('sync')
    .description('MCP 설정 동기화')
    .option('--tool <tool-id>', '특정 도구만 동기화')
    .option('--all', '모든 도구 동기화')
    .option('--source <id>', '동기화할 MCP Set ID')
    .option('--strategy <type>', '동기화 전략 (overwrite, append, deep-merge, smart-update)', 'overwrite')
    .option('-v, --verbose', '도구별 경로/서버 정보를 함께 표시')
    .action(async (options) => {
        if (!options.tool && !options.all) {
            console.log(chalk.yellow('--tool 또는 --all 옵션을 지정해주세요.'));
            syncCommand.help();
            return;
        }

        // 레지스트리 및 MCP Set 목록 로드
        const registryPath = path.join(os.homedir(), '.ai-cli-syncer', 'registry.json');
        const tools = await scanForTools();
        const { fetchMcpSets } = await import('../services/mcp-multi.js');
        const mcpSets = fetchMcpSets();

        let sourceId = options.source;

        // Source ID가 없으면 대화형으로 선택
        if (!sourceId && mcpSets.length > 0) {
            const { default: inquirer } = await import('inquirer');
            const choices = mcpSets.map(set => ({
                name: `${set.name} (${set.items.length} items)`,
                value: set.id
            }));

            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'sourceId',
                    message: '동기화할 MCP Set을 선택하세요:',
                    choices: choices
                }
            ]);
            sourceId = answer.sourceId;
        }

        if (!sourceId) {
            console.log(chalk.red('✖ 동기화할 소스(MCP Set)를 지정해야 합니다. (--source 또는 대화형 선택)'));
            return;
        }

        if (options.all) {
            console.log(chalk.bold('\n🔄 전체 동기화 시작...\n'));
            const results = await syncAllTools(sourceId);

            results.forEach(r => printResult(r.status, r.name, r.path, r.message, r.servers, options.verbose));

            console.log(chalk.green('\n✓ 전체 동기화 완료\n'));
        } else if (options.tool) {
            const tool = tools.find(t => t.id === options.tool);
            if (!tool) {
                console.log(chalk.red(`✖ 도구 '${options.tool}'를 찾을 수 없습니다.`));
                return;
            }

            if (!tool.exists) {
                console.log(chalk.red(`✖ 도구 '${options.tool}'가 설치되어 있지 않습니다.`));
                return;
            }

            const meta = getToolMetadata(tool.id);
            if (meta?.supportsMcp === false) {
                printResult('unsupported', tool.name, tool.configPath, 'MCP 동기화를 지원하지 않는 도구입니다.');
                return;
            }

            const syncConfig = loadSyncConfig();
            const toolSyncConfig = syncConfig[tool.id];

            if (!toolSyncConfig || !toolSyncConfig.enabled) {
                console.log(chalk.yellow(`⚠ 도구 '${options.tool}'의 동기화가 비활성화되어 있습니다.`));
                return;
            }

            console.log(chalk.bold(`\n🔄 ${tool.name} 동기화 시작...\n`));
            const strategy = options.strategy || 'overwrite';
            console.log(chalk.gray(`전략: ${strategy}`));
            console.log(chalk.gray(`소스: ${mcpSets.find(s => s.id === sourceId)?.name || sourceId}\n`));

            try {
                const applied = await syncToolMcp(tool.id, tool.configPath, toolSyncConfig.servers, strategy, undefined, sourceId);
                printResult('success', tool.name, tool.configPath, undefined, applied, options.verbose);
            } catch (error: any) {
                printResult('error', tool.name, tool.configPath, error.message);
            }
            console.log('');
        }
    });

function printResult(status: SyncResultStatus, name: string, path: string, message?: string, servers?: string[], verbose?: boolean) {
    const stateText = formatStatus(status);
    const base = `${stateText} ${name} <${path}>`;
    const detail = verbose && servers ? ` (servers: ${servers.length ? servers.join(', ') : '없음'})` : '';
    const reason = message ? ` - ${message}` : '';
    console.log(base + detail + reason);
}

function formatStatus(status: SyncResultStatus): string {
    switch (status) {
        case 'success':
            return '✅ [성공]';
        case 'skipped':
            return '⚠️ [스킵]';
        case 'unsupported':
            return '🚫 [지원 안 함]';
        case 'error':
        default:
            return '❌ [오류]';
    }
}
