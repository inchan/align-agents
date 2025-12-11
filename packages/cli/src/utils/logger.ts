import chalk from 'chalk';
import path from 'path';
import { LoggerService } from '../services/LoggerService.js';

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
    private static logger = LoggerService.getInstance();

    // 단일 동기화 시작
    static logSyncStart(toolName: string, type: 'rules' | 'mcp', strategy?: string) {
        const typeText = type === 'rules' ? 'Rules' : 'MCP';
        const message = `🔄 ${toolName} ${typeText} 동기화 시작...`;

        // 콘솔 출력 (chalk 포맷)
        console.log(chalk.bold(`\n${message}\n`));
        if (strategy) {
            console.log(chalk.gray(`전략: ${strategy}\n`));
        }

        // UI 로그 (LoggerService)
        this.logger.log('info', `[Sync] ${toolName} ${typeText} 동기화 시작`, { strategy });
    }

    // 전체 동기화 시작
    static logBatchSyncStart(count: number, type: 'rules' | 'mcp') {
        const typeText = type === 'rules' ? 'Rules' : 'MCP';
        const message = `🔄 ${count}개 도구 ${typeText} 동기화 시작...`;

        // 콘솔 출력
        console.log(chalk.bold(`\n${message}\n`));

        // UI 로그
        this.logger.log('info', `[Sync] ${count}개 도구 ${typeText} 일괄 동기화 시작`);
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

        let consoleMessage = `  ${icon} ${toolNameFormatted} ${chalk.gray(`(${entry.toolId})`)}`;

        if (entry.status === 'error') {
            consoleMessage += chalk.red(` - Failed`);
        } else if (entry.status === 'skipped') {
            consoleMessage += chalk.yellow(` - Skipped`);
        }

        if (entry.targetPath) {
            consoleMessage += `\n    ${chalk.gray('Path:')} ${displayPath}`;
        }

        if (entry.message && entry.status !== 'success') {
            consoleMessage += `\n    ${chalk.red('Error:')} ${entry.message}`;
        }

        console.log(consoleMessage);

        // UI 로그 (LoggerService)
        const level = entry.status === 'error' ? 'error' :
            entry.status === 'skipped' || entry.status === 'not-supported' ? 'warn' : 'info';

        const statusText = this.getStatusTextPlain(entry.status);
        const uiMessage = `${entry.toolName} (${entry.toolId}) - ${statusText}`;

        this.logger.log(level, `[Sync] ${uiMessage}`, {
            type: entry.type,
            toolId: entry.toolId,
            status: entry.status,
            targetPath: entry.targetPath,
            errorMessage: entry.message,
        });
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

        // UI 로그
        const level = failed > 0 ? 'warn' : 'info';
        this.logger.log(level, `[Sync] 완료: ${success} 성공, ${failed} 실패, ${skipped} 스킵`);
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

    private static getStatusTextPlain(status: string): string {
        switch (status) {
            case 'success': return '성공';
            case 'error': return '실패';
            case 'skipped': return '스킵';
            case 'not-supported': return '미지원';
            default: return '알 수 없음';
        }
    }
}
