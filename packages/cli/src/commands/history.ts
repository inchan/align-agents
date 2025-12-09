import { Command } from 'commander';
import chalk from 'chalk';
import { listVersions, getVersionContent } from '../services/history.js';
import { saveMasterRules } from '../services/rules.js';
import { saveMasterMcp } from '../services/sync.js';

export const historyCommand = new Command('history')
    .description('설정 히스토리 관리')
    .action(() => {
        historyCommand.outputHelp();
    });

// acs history list
historyCommand
    .command('list')
    .description('저장된 버전 목록 조회')
    .option('--type <type>', '타입 필터 (rules, mcp)')
    .action((options) => {
        const type = options.type as 'rules' | 'mcp' | undefined;
        const versions = listVersions(type);

        if (versions.length === 0) {
            console.log(chalk.yellow('\n저장된 버전이 없습니다.\n'));
            return;
        }

        console.log(chalk.bold('\n📜 저장된 버전 목록:\n'));
        versions.forEach((v, idx) => {
            const typeLabel = v.type === 'rules' ? chalk.cyan('[Rules]') : chalk.green('[MCP]');
            const desc = v.description ? ` - ${v.description}` : '';
            console.log(`${idx + 1}. ${typeLabel} ${v.timestamp} (ID: ${v.id})${desc}`);
        });
        console.log('');
    });

// acs history show
historyCommand
    .command('show <id>')
    .description('특정 버전의 내용 보기')
    .action((id) => {
        const content = getVersionContent(id);
        if (!content) {
            console.log(chalk.red(`\n✖ 버전 '${id}'를 찾을 수 없습니다.\n`));
            return;
        }

        console.log(chalk.bold(`\n📄 버전 ${id} 내용:\n`));
        console.log(content);
        console.log('');
    });

// acs history restore
historyCommand
    .command('restore <id>')
    .description('특정 버전으로 복원')
    .action(async (id) => {
        const versions = listVersions();
        const version = versions.find(v => v.id === id);

        if (!version) {
            console.log(chalk.red(`\n✖ 버전 '${id}'를 찾을 수 없습니다.\n`));
            return;
        }

        const content = getVersionContent(id);
        if (!content) {
            console.log(chalk.red(`\n✖ 버전 내용을 읽을 수 없습니다.\n`));
            return;
        }

        try {
            if (version.type === 'rules') {
                await saveMasterRules(content);
                console.log(chalk.green(`\n✓ Master Rules를 버전 ${id}로 복원했습니다.\n`));
            } else if (version.type === 'mcp') {
                const config = JSON.parse(content);
                await saveMasterMcp(config);
                console.log(chalk.green(`\n✓ Master MCP를 버전 ${id}로 복원했습니다.\n`));
            }
        } catch (error: any) {
            console.log(chalk.red(`\n✖ 복원 실패: ${error.message}\n`));
        }
    });
