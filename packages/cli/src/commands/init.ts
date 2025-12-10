import { Command } from 'commander';
import chalk from 'chalk';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { SyncService } from '../services/impl/SyncService.js';
import { RulesService } from '../services/impl/RulesService.js';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';
import { initBackupRepo, createBackup } from '../services/backup.js';
import { scanForTools, type ToolConfig } from '../services/scanner.js';
import { getConfigDir } from '../constants/paths.js';

export const initCommand = new Command('init')
    .description('AI CLI Syncer 초기 설정')
    .action(async () => {
        console.log(chalk.bold.cyan('\n🚀 AI CLI Syncer 초기 설정을 시작합니다!\n'));

        const fsSystem = new NodeFileSystem();
        const syncService = new SyncService(fsSystem);
        const rulesService = new RulesService(fsSystem);

        const masterDir = await syncService.getMasterDir();

        // 1. 이미 초기화되었는지 확인
        if (fs.existsSync(masterDir)) {
            const { overwrite } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'overwrite',
                    message: '이미 설정 디렉토리가 존재합니다. 다시 초기화하시겠습니까?',
                    default: false,
                },
            ]);

            if (!overwrite) {
                console.log(chalk.yellow('\n초기화를 취소했습니다.'));
                return;
            }
        }

        // 2. 마스터 디렉토리 생성
        console.log(chalk.blue('\n📁 설정 디렉토리 생성 중...'));
        if (!fs.existsSync(masterDir)) {
            fs.mkdirSync(masterDir, { recursive: true });
        }
        console.log(chalk.green(`✓ ${masterDir}`));

        // 3. Git 저장소 초기화
        console.log(chalk.blue('\n💾 Git 저장소 초기화 중...'));
        try {
            await initBackupRepo();
            console.log(chalk.green('✓ Git 저장소가 초기화되었습니다.'));
        } catch (error: any) {
            console.log(chalk.yellow(`⚠ Git 초기화 실패: ${error.message}`));
        }

        // 4. 기본 설정 파일 생성
        console.log(chalk.blue('\n⚙️  기본 설정 파일 생성 중...'));

        // 전역 설정
        const configDir = getConfigDir();
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        await syncService.saveGlobalConfig({
            masterDir,
            autoBackup: true,
        });
        console.log(chalk.green('✓ config.json'));

        // Master MCP and Rules creation removed


        // 동기화 설정 (DB 기반이므로 파일 생성 대신 초기값 저장)
        const defaultSyncConfig: any = {};
        await syncService.saveSyncConfig(defaultSyncConfig);
        console.log(chalk.green('✓ sync-config.json (Database Initialized)'));

        // Rules 설정 (DB 기반이므로 파일 생성 대신 초기값 저장)
        const defaultRulesConfig = {};
        await rulesService.saveRulesConfig(defaultRulesConfig);
        console.log(chalk.green('✓ rules-config.json (Database Initialized)'));

        // 5. 도구 스캔
        console.log(chalk.blue('\n🔍 설치된 AI 도구 스캔 중...'));
        const tools = await scanForTools();
        const installedTools = tools.filter((t: ToolConfig) => t.exists);
        console.log(chalk.green(`✓ ${installedTools.length}개의 도구를 발견했습니다.`));
        installedTools.forEach((tool: ToolConfig) => {
            console.log(chalk.gray(`  - ${tool.name}`));
        });

        // 6. 초기 백업 생성
        console.log(chalk.blue('\n💾 초기 백업 생성 중...'));
        try {
            await createBackup('Initial setup');
            console.log(chalk.green('✓ 초기 백업이 생성되었습니다.'));
        } catch (error: any) {
            console.log(chalk.yellow(`⚠ 백업 생성 실패: ${error.message}`));
        }

        // 7. 다음 단계 안내
        console.log(chalk.bold.green('\n✨ 초기 설정이 완료되었습니다!\n'));
        console.log(chalk.cyan('다음 단계:'));
        console.log(chalk.white('  1. MCP 서버 추가: ') + chalk.gray('acs mcp add <name>'));
        console.log(chalk.white('  2. Rules 편집: ') + chalk.gray('acs rules edit'));
        console.log(chalk.white('  3. 설정 동기화: ') + chalk.gray('acs sync --tool <tool-name>'));
        console.log(chalk.white('  4. 상태 확인: ') + chalk.gray('acs status'));
        console.log('');
    });
