import chalk from 'chalk';
import path from 'path';

export interface SyncLogEntry {
    type: 'rules' | 'mcp';
    toolId: string;
    toolName: string;
    status: 'success' | 'error' | 'skipped' | 'not-supported';
    targetPath?: string;
    message?: string;
    strategy?: string;
}

export class SyncLogger {
    // 단일 동기화 시작
    static logSyncStart(toolName: string, type: 'rules' | 'mcp', strategy?: string) {
        console.log(chalk.bold(`\n🔄 ${toolName} ${type === 'rules' ? 'Rules' : 'MCP'} 동기화 시작...\n`));
        if (strategy) {
            console.log(chalk.gray(`전략: ${strategy}\n`));
        }
    }

    // 전체 동기화 시작
    static logBatchSyncStart(count: number, type: 'rules' | 'mcp') {
        console.log(chalk.bold(`\n🔄 ${count}개 도구 ${type === 'rules' ? 'Rules' : 'MCP'} 동기화 시작...\n`));
    }

    // 개별 결과 로그
    static logResult(entry: SyncLogEntry) {
        const icon = this.getStatusIcon(entry.status);
        const typeText = entry.type === 'rules' ? 'Rules' : 'MCP';
        const toolNameFormatted = chalk.bold(entry.toolName);

        // 경로를 절대 경로로 변환하여 클릭 가능하게
        const displayPath = entry.targetPath
            ? chalk.cyan(path.resolve(entry.targetPath))
            : '';

        let message = `  ${icon} ${toolNameFormatted} ${chalk.gray(`(${entry.toolId})`)}`;

        if (entry.status === 'error') {
            message += chalk.red(` - Failed`);
        } else if (entry.status === 'skipped') {
            message += chalk.yellow(` - Skipped`);
        }

        if (entry.targetPath) {
            message += `\n    ${chalk.gray('Path:')} ${displayPath}`;
        }

        if (entry.message && entry.status !== 'success') {
            message += `\n    ${chalk.red('Error:')} ${entry.message}`;
        }

        console.log(message);
    }

    // 요약 로그
    static logSummary(entries: SyncLogEntry[]) {
        const success = entries.filter(e => e.status === 'success').length;
        const failed = entries.filter(e => e.status === 'error').length;
        const skipped = entries.filter(e => e.status === 'skipped' || e.status === 'not-supported').length;

        console.log('');
        if (success > 0) console.log(chalk.green(`  ✔ ${success} synced successfully`));
        if (failed > 0) console.log(chalk.red(`  ✖ ${failed} failed`));
        if (skipped > 0) console.log(chalk.yellow(`  ! ${skipped} skipped`));
        console.log('');
    }

    private static getStatusIcon(status: string): string {
        switch (status) {
            case 'success': return chalk.green('✔');
            case 'error': return chalk.red('✖');
            case 'skipped': return chalk.yellow('!');
            case 'not-supported': return chalk.gray('🚫');
            default: return chalk.blue('?');
        }
    }

    private static getStatusText(status: string): string {
        switch (status) {
            case 'success': return chalk.green('[성공]');
            case 'error': return chalk.red('[실패]');
            case 'skipped': return chalk.yellow('[스킵]');
            case 'not-supported': return chalk.gray('[미지원]');
            default: return '[알 수 없음]';
        }
    }
}
