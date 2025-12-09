import { Command } from 'commander';
import chalk from 'chalk';
import { createBackup, getBackups, restoreBackup } from '../services/backup.js';

export const backupCommand = new Command('backup')
    .description('설정 백업 및 복원')
    .action(() => {
        backupCommand.outputHelp();
    });

backupCommand
    .command('create [message]')
    .description('현재 설정 백업 생성')
    .action(async (message) => {
        try {
            console.log(chalk.blue('💾 백업 생성 중...'));
            const hash = await createBackup(message);
            console.log(chalk.green(`✓ 백업 완료: ${hash}`));
        } catch (error: any) {
            console.log(chalk.red(`✖ 오류: ${error.message}`));
        }
    });

backupCommand
    .command('list')
    .description('백업 목록 조회')
    .action(async () => {
        try {
            const backups = await getBackups();

            if (backups.length === 0) {
                console.log(chalk.yellow('백업 내역이 없습니다.'));
                return;
            }

            console.log(chalk.bold('\n📜 백업 목록\n'));
            backups.forEach(backup => {
                console.log(`${chalk.cyan(backup.hash)}  ${chalk.gray(backup.date)}  ${backup.message}`);
            });
            console.log('');
        } catch (error: any) {
            console.log(chalk.red(`✖ 오류: ${error.message}`));
        }
    });

backupCommand
    .command('restore <hash>')
    .description('특정 시점으로 설정 복원')
    .action(async (hash) => {
        try {
            console.log(chalk.blue(`↺ ${hash} 시점으로 복원 중...`));
            await restoreBackup(hash);
            console.log(chalk.green('✓ 복원 완료'));
        } catch (error: any) {
            console.log(chalk.red(`✖ 오류: ${error.message}`));
        }
    });
