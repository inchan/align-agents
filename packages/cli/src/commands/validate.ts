import { Command } from 'commander';
import chalk from 'chalk';
import { loadSyncConfig, getGlobalConfig } from '../services/sync.js';
import { loadRulesConfig } from '../services/rules.js';
import { validateDataSafe } from '../utils/validation.js';
import { MasterMcpConfigSchema, SyncConfigSchema } from '../schemas/mcp.schema.js';
import { RulesConfigSchema, GlobalConfigSchema } from '../schemas/rules.schema.js';

export const validateCommand = new Command('validate')
    .description('설정 파일 검증')
    .option('--mcp', 'MCP 설정만 검증')
    .option('--rules', 'Rules 설정만 검증')
    .option('--config', '전역 설정만 검증')
    .action((options) => {
        console.log(chalk.bold('\n🔍 설정 파일 검증\n'));

        let hasErrors = false;

        // 전체 검증 또는 개별 검증
        const validateAll = !options.mcp && !options.rules && !options.config;

        // MCP 설정 검증
        if (validateAll || options.mcp) {
            hasErrors = validateMcp() || hasErrors;
        }

        // Rules 설정 검증
        if (validateAll || options.rules) {
            hasErrors = validateRules() || hasErrors;
        }

        // 전역 설정 검증
        if (validateAll || options.config) {
            hasErrors = validateGlobalConfig() || hasErrors;
        }

        console.log('');

        if (hasErrors) {
            console.log(chalk.red('✖ 검증 실패: 위의 오류를 수정해주세요.\n'));
            process.exit(1);
        } else {
            console.log(chalk.green('✓ 모든 설정 파일이 유효합니다.\n'));
        }
    });

function validateMcp(): boolean {
    console.log(chalk.bold('📦 MCP 설정 검증'));

    let hasErrors = false;

    try {
        // Master MCP validation removed

        // 동기화 설정 검증
        const syncConfig = loadSyncConfig();
        const syncResult = validateDataSafe(SyncConfigSchema, syncConfig);

        if (!syncResult.success) {
            console.log(chalk.red('  ✖ sync-config.json:'));
            syncResult.errors.forEach(err => console.log(chalk.red(`    - ${err}`)));
            hasErrors = true;
        } else {
            console.log(chalk.green('  ✓ sync-config.json'));
        }
    } catch (error: any) {
        console.log(chalk.red(`  ✖ 오류: ${error.message}`));
        hasErrors = true;
    }

    console.log('');
    return hasErrors;
}

function validateRules(): boolean {
    console.log(chalk.bold('📝 Rules 설정 검증'));

    let hasErrors = false;

    try {
        const rulesConfig = loadRulesConfig();
        const result = validateDataSafe(RulesConfigSchema, rulesConfig);

        if (!result.success) {
            console.log(chalk.red('  ✖ rules-config.json:'));
            result.errors.forEach(err => console.log(chalk.red(`    - ${err}`)));
            hasErrors = true;
        } else {
            console.log(chalk.green('  ✓ rules-config.json'));
        }
    } catch (error: any) {
        console.log(chalk.red(`  ✖ 오류: ${error.message}`));
        hasErrors = true;
    }

    console.log('');
    return hasErrors;
}

function validateGlobalConfig(): boolean {
    console.log(chalk.bold('⚙️  전역 설정 검증'));

    let hasErrors = false;

    try {
        const globalConfig = getGlobalConfig();
        const result = validateDataSafe(GlobalConfigSchema, globalConfig);

        if (!result.success) {
            console.log(chalk.red('  ✖ config.json:'));
            result.errors.forEach(err => console.log(chalk.red(`    - ${err}`)));
            hasErrors = true;
        } else {
            console.log(chalk.green('  ✓ config.json'));
        }
    } catch (error: any) {
        console.log(chalk.red(`  ✖ 오류: ${error.message}`));
        hasErrors = true;
    }

    console.log('');
    return hasErrors;
}
