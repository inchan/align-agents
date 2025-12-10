import { Command } from 'commander';
import chalk from 'chalk';
import { SyncService } from '../services/impl/SyncService.js';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';

export const configCommand = new Command('config')
    .description('전역 설정 관리')
    .option('--master-dir <path>', '마스터 폴더 경로 설정')
    .option('--get <key>', '설정 값 조회')
    .action(async (options) => {
        const fileSystem = new NodeFileSystem();
        const syncService = new SyncService(fileSystem);

        if (options.masterDir) {
            await syncService.setMasterDir(options.masterDir);
            console.log(chalk.green(`✓ 마스터 폴더 경로 설정: ${options.masterDir}`));
            return;
        }

        if (options.get) {
            const config = await syncService.getGlobalConfig();
            const value = (config as any)[options.get];
            if (value !== undefined) {
                console.log(chalk.cyan(`${options.get}: ${value}`));
            } else {
                console.log(chalk.red(`✖ 설정 '${options.get}'를 찾을 수 없습니다.`));
            }
            return;
        }

        // 옵션이 없으면 전체 설정 표시
        const config = await syncService.getGlobalConfig();
        console.log(chalk.bold('\n⚙️  전역 설정:\n'));
        console.log(chalk.cyan('  masterDir:'), config.masterDir);
        console.log(chalk.cyan('  autoBackup:'), config.autoBackup);
        console.log('');
    });
