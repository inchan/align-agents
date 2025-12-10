import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import { getRegistryPath } from '../constants/paths.js';
import path from 'path';
import os from 'os';
import { SyncService } from '../services/impl/SyncService.js';
import { RulesService } from '../services/impl/RulesService.js';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';

export const statusCommand = new Command('status')
    .description('동기화 상태 확인')
    .action(async () => {
        console.log(chalk.bold('\n📊 align-agents 상태\n'));

        // Initialize Services
        const fsSystem = new NodeFileSystem();
        const syncService = new SyncService(fsSystem);
        const rulesService = new RulesService(fsSystem);

        // 1. 도구 스캔 상태
        showToolsStatus();

        // 2. MCP 동기화 상태
        await showMcpStatus(syncService);

        // 3. Rules 동기화 상태
        await showRulesStatus(rulesService);

        // 4. 백업 상태
        showBackupStatus();

        console.log('');
    });

function showToolsStatus() {
    const registryPath = getRegistryPath();

    if (!fs.existsSync(registryPath)) {
        console.log(chalk.yellow('⚠  도구 스캔 필요: acs scan 명령어를 실행하세요.\n'));
        return;
    }

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    const tools = registry.tools || [];
    const installedTools = tools.filter((t: any) => t.exists);
    const lastScan = registry.lastScan ? new Date(registry.lastScan).toLocaleString() : '없음';

    console.log(chalk.bold('🔍 도구 스캔 상태'));
    console.log(`  설치된 도구: ${chalk.green(installedTools.length)}/${tools.length}`);
    console.log(`  마지막 스캔: ${chalk.cyan(lastScan)}`);

    if (installedTools.length > 0) {
        console.log(`  도구 목록: ${installedTools.map((t: any) => t.name).join(', ')}`);
    }
    console.log('');
}

async function showMcpStatus(syncService: SyncService) {
    try {
        const syncConfig = await syncService.loadSyncConfig();
        const enabledTools = Object.entries(syncConfig).filter(([_, config]) => config.enabled).length;

        console.log(chalk.bold('🔌 MCP 동기화 상태'));
        console.log(chalk.yellow('  Master MCP 개념 제거됨 - MCP Sets 사용 권장'));
        console.log(`  동기화 활성화: ${chalk.green(enabledTools)}개 도구`);

        if (enabledTools > 0) {
            const enabledToolNames = Object.entries(syncConfig)
                .filter(([_, config]) => config.enabled)
                .map(([toolId, _]) => toolId);
            console.log(`  활성화된 도구: ${enabledToolNames.join(', ')}`);
        }
    } catch (error) {
        console.log(chalk.yellow('  MCP 설정 없음'));
    }
    console.log('');
}

async function showRulesStatus(rulesService: RulesService) {
    try {
        const rulesConfig = await rulesService.loadRulesConfig();
        const enabledTools = Object.entries(rulesConfig).filter(([_, config]) => config.enabled).length;

        console.log(chalk.bold('📝 Rules 동기화 상태'));
        console.log(chalk.yellow('  Master Rules 개념 제거됨 - Rules 관리 사용 권장'));
        console.log(`  동기화 활성화: ${chalk.green(enabledTools)}개 도구`);

        if (enabledTools > 0) {
            const enabledToolNames = Object.entries(rulesConfig)
                .filter(([_, config]) => config.enabled)
                .map(([toolId, _]) => toolId);
            console.log(`  활성화된 도구: ${enabledToolNames.join(', ')}`);
        }
    } catch (error) {
        console.log(chalk.yellow('  Rules 설정 없음'));
    }
    console.log('');
}

function showBackupStatus() {
    const registryPath = getRegistryPath();

    if (!fs.existsSync(registryPath)) {
        return;
    }

    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    const tools = registry.tools || [];
    let backupCount = 0;

    for (const tool of tools) {
        if (tool.exists && fs.existsSync(tool.configPath)) {
            const backupPath = `${tool.configPath}.bak`;
            if (fs.existsSync(backupPath)) {
                backupCount++;
            }
        }
    }

    console.log(chalk.bold('💾 백업 상태'));
    console.log(`  백업 파일: ${chalk.green(backupCount)}개`);

    if (backupCount > 0) {
        console.log(chalk.gray('  (설정 파일 수정 시 자동 생성됨)'));
    }
}
