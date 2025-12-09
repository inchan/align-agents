import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadMasterMcp, loadSyncConfig } from '../services/sync.js';
import { loadMasterRules, loadRulesConfig } from '../services/rules.js';

export const statusCommand = new Command('status')
    .description('동기화 상태 확인')
    .action(() => {
        console.log(chalk.bold('\n📊 AI CLI Syncer 상태\n'));

        // 1. 도구 스캔 상태
        showToolsStatus();

        // 2. MCP 동기화 상태
        showMcpStatus();

        // 3. Rules 동기화 상태
        showRulesStatus();

        // 4. 백업 상태
        showBackupStatus();

        console.log('');
    });

function showToolsStatus() {
    const registryPath = path.join(os.homedir(), '.ai-cli-syncer', 'registry.json');

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

function showMcpStatus() {
    try {
        const masterMcp = loadMasterMcp();
        const syncConfig = loadSyncConfig();
        const serverCount = Object.keys(masterMcp.mcpServers).length;
        const enabledTools = Object.entries(syncConfig).filter(([_, config]) => config.enabled).length;

        console.log(chalk.bold('🔌 MCP 동기화 상태'));
        console.log(`  마스터 MCP 서버: ${chalk.green(serverCount)}개`);
        console.log(`  동기화 활성화: ${chalk.green(enabledTools)}개 도구`);

        if (serverCount > 0) {
            console.log(`  서버 목록: ${Object.keys(masterMcp.mcpServers).join(', ')}`);
        }

        if (enabledTools > 0) {
            const enabledToolNames = Object.entries(syncConfig)
                .filter(([_, config]) => config.enabled)
                .map(([toolId, _]) => toolId);
            console.log(`  활성화된 도구: ${enabledToolNames.join(', ')}`);
        }
    } catch (error) {
        console.log(chalk.yellow('  마스터 MCP 설정 없음'));
    }
    console.log('');
}

function showRulesStatus() {
    try {
        const masterRules = loadMasterRules();
        const rulesConfig = loadRulesConfig();
        const hasRules = masterRules.length > 100; // 기본 템플릿보다 긴지 확인
        const enabledTools = Object.entries(rulesConfig).filter(([_, config]) => config.enabled).length;

        console.log(chalk.bold('📝 Rules 동기화 상태'));
        console.log(`  마스터 Rules: ${hasRules ? chalk.green('작성됨') : chalk.yellow('기본 템플릿')}`);
        console.log(`  동기화 활성화: ${chalk.green(enabledTools)}개 도구`);

        if (enabledTools > 0) {
            const enabledToolNames = Object.entries(rulesConfig)
                .filter(([_, config]) => config.enabled)
                .map(([toolId, _]) => toolId);
            console.log(`  활성화된 도구: ${enabledToolNames.join(', ')}`);
        }
    } catch (error) {
        console.log(chalk.yellow('  마스터 Rules 설정 없음'));
    }
    console.log('');
}

function showBackupStatus() {
    const registryPath = path.join(os.homedir(), '.ai-cli-syncer', 'registry.json');

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
