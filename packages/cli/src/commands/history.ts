import { Command } from 'commander';
import chalk from 'chalk';
import { listVersions, getVersionContent } from '../services/history.js';
// Master methods removed - history restore functionality disabled

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

// acs history restore - DISABLED (master concepts removed)
historyCommand
    .command('restore <id>')
    .description('[DEPRECATED] 특정 버전으로 복원 (Master 개념 제거로 비활성화)')
    .action(async (id) => {
        console.log(chalk.yellow('\n⚠ 이 명령어는 Master MCP/Rules 개념 제거로 인해 비활성화되었습니다.'));
        console.log(chalk.gray('대신 Rules 또는 MCP Sets를 직접 편집하여 사용하세요.\n'));
    });
