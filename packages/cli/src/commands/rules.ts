import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { syncToolRules, syncAllToolsRules, getToolRulesFilename, listSupportedTools } from '../services/rules.js';
import { getMasterDir } from '../services/sync.js';


export const rulesCommand = new Command('rules')
    .description('Rules 관리 및 동기화')
    .action(() => {
        rulesCommand.outputHelp();
    });



// Master rules 'show' and 'edit' commands removed


// acs rules sync
rulesCommand
    .command('sync')
    .description('Rules 동기화')
    .option('--source <id>', '동기화할 Rule ID')
    .option('--tool <tool-id>', '특정 도구만 동기화')
    .option('--all', '모든 도구 동기화')
    .option('--project <path>', '프로젝트 경로')
    .option('--global', '전역 Rules 동기화')
    .option('--strategy <type>', '동기화 전략 (overwrite, append, deep-merge, smart-update)', 'overwrite')
    .option('-v, --verbose', '상세 정보 표시')
    .action(async (options) => {
        if (!options.tool && !options.all) {
            console.log(chalk.yellow('--tool 또는 --all 옵션을 지정해주세요.'));
            rulesCommand.help();
            return;
        }

        // Rules 리스트 로드
        const { fetchRulesList } = await import('../services/rules-multi.js');
        const rulesList = fetchRulesList();

        let sourceId = options.source;

        // Source ID가 없으면 대화형으로 선택
        if (!sourceId && rulesList.length > 0) {
            // CLI 환경에서 inquirer가 필요하므로 동적 임포트 확인 (이미 상단에 import 되어있으나 여기서는 안전하게 사용)
            const choices = rulesList.map(rule => ({
                name: `${rule.name} (Updated: ${new Date(rule.updatedAt).toLocaleDateString()})`,
                value: rule.id
            }));

            const answer = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'sourceId',
                    message: '동기화할 Rule을 선택하세요:',
                    choices: choices
                }
            ]);
            sourceId = answer.sourceId;
        }

        if (!sourceId) {
            console.log(chalk.red('✖ 동기화할 소스(Rule)를 지정해야 합니다. (--source 또는 대화형 선택)'));
            return;
        }

        const selectedRule = rulesList.find(r => r.id === sourceId);
        const ruleName = selectedRule ? selectedRule.name : sourceId;
        const ruleLength = selectedRule ? selectedRule.content.length : 0;

        if (options.all) {
            // --project 옵션이 없으면 전역 동기화를 기본값으로 설정
            const useGlobal = !options.project;
            const targetPath = options.project || '';
            const strategy = options.strategy || 'overwrite';

            console.log(chalk.cyan(`\n📋 선택된 Rule 정보: ${ruleName}`));
            console.log(chalk.gray(`   ID: ${sourceId}`));
            console.log(chalk.gray(`   크기: ${ruleLength} 바이트`));
            console.log(chalk.gray(`   전략: ${strategy}`));
            console.log(chalk.gray(`   모드: ${useGlobal ? '전역 동기화' : '프로젝트 동기화'}\n`));

            // 동기화 실행 (SyncLogger가 자동으로 로그 출력)
            const results = await syncAllToolsRules(targetPath, strategy, sourceId);

            // 성공 메시지
            console.log(chalk.green('✓ 전체 동기화 완료\n'));
        } else if (options.tool) {
            const filename = getToolRulesFilename(options.tool);
            if (!filename) {
                console.log(chalk.red(`✖ 알 수 없는 도구: ${options.tool}`));
                console.log(chalk.yellow('\n지원하는 도구: claude-code-cli, codex, gemini-cli, cursor-ide'));
                return;
            }

            if (!options.global && !options.project) {
                console.log(chalk.red('✖ --project 또는 --global 옵션을 지정해주세요.'));
                return;
            }

            console.log(chalk.bold(`\n🔄 ${options.tool} Rules 동기화 시작...`));
            console.log(chalk.cyan(`Rule: ${ruleName}`));

            try {
                const strategy = options.strategy || 'overwrite';
                console.log(chalk.gray(`전략: ${strategy}\n`));

                // --project 옵션이 있으면 자동으로 global을 false로 설정
                const useGlobal = options.global !== undefined
                    ? options.global
                    : (options.project ? false : true);

                await syncToolRules(options.tool, options.project || '', useGlobal, strategy, undefined, sourceId);
                const targetPath = useGlobal ? '전역' : options.project;
                console.log(chalk.green(`\n✓ ${filename} → ${targetPath} 동기화 완료\n`));
            } catch (error: any) {
                console.log(chalk.red(`\n✖ 동기화 실패: ${error.message}\n`));
            }
        }
    });

function getStatusIcon(status: string): string {
    switch (status) {
        case 'success': return '✅';
        case 'skipped': return '⏭️';
        case 'error': return '❌';
        case 'not-supported': return '🚫';
        default: return '❓';
    }
}

function getStatusText(status: string): string {
    switch (status) {
        case 'success': return chalk.green('[성공]');
        case 'skipped': return chalk.yellow('[스킵]');
        case 'error': return chalk.red('[오류]');
        case 'not-supported': return chalk.gray('[미지원]');
        default: return chalk.gray('[알 수 없음]');
    }
}

// acs rules list-tools
rulesCommand
    .command('list-tools')
    .description('지원하는 도구 목록')
    .action(() => {
        console.log(chalk.bold('\n📋 지원하는 도구:\n'));
        console.log(chalk.cyan('  claude-code-cli') + ' → CLAUDE.md');
        console.log(chalk.cyan('  codex') + ' → AGENTS.md');
        console.log(chalk.cyan('  gemini-cli') + ' → GEMINI.md');
        console.log(chalk.cyan('  cursor-ide') + ' → .cursorrules');
        console.log('');
    });
