import os from 'os';
import { getConfigDir } from '../../constants/paths.js';
import { IRulesService, RulesConfig, RulesSyncResult, Rule } from '../../interfaces/IRulesService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { applySyncStrategy, type SyncStrategy } from '../strategies.js';
import { validateData } from '../../utils/validation.js';
import { RulesConfigSchema } from '../../schemas/rules.schema.js';
import { getToolMetadata, getRulesCapableTools } from '../../constants/tools.js';
import { saveVersion } from '../../services/history.js';
import { createTimestampedBackup } from '../../utils/backup.js';
import { RulesConfigRepository } from '../../infrastructure/repositories/RulesConfigRepository.js';
import { SyncLogger } from '../../utils/logger.js';
import { ChecksumService } from './ChecksumService.js';
import { StateService } from './StateService.js';

export class RulesService implements IRulesService {
    private repository: RulesConfigRepository;
    private masterDir: string;
    private checksumService: ChecksumService;
    private stateService: StateService;

    constructor(private fs: IFileSystem, masterDir?: string) {
        this.masterDir = masterDir || this.getDefaultMasterDir();
        this.repository = new RulesConfigRepository(fs, this.masterDir);
        this.checksumService = new ChecksumService();
        this.stateService = new StateService();
    }

    private getDefaultMasterDir(): string {
        return getConfigDir();
    }

    private getMasterDir(): string {
        return this.masterDir;
    }

    // Multi-rules management
    async getRulesList(): Promise<Rule[]> {
        return this.repository.getRulesList();
    }

    async getRule(id: string): Promise<Rule | null> {
        return this.repository.getRule(id);
    }

    async createRule(name: string, content: string): Promise<Rule> {
        return this.repository.createRule(name, content);
    }

    async updateRule(id: string, content: string, name?: string): Promise<Rule> {
        return this.repository.updateRule(id, content, name);
    }

    async deleteRule(id: string): Promise<void> {
        return this.repository.deleteRule(id);
    }

    async setActiveRule(id: string): Promise<void> {
        return this.repository.setActiveRule(id);
    }

    // Master rules methods removed

    loadRulesConfig(): RulesConfig {
        const masterDir = this.getMasterDir();
        const configPath = this.fs.join(masterDir, 'rules-config.json');

        if (this.fs.exists(configPath)) {
            try {
                const data = this.fs.readFile(configPath);
                return JSON.parse(data);
            } catch (error) {
                console.warn(`[CLI] rules-config.json을 파싱할 수 없어 빈 설정으로 대체합니다. (${configPath})`, error);
                return {};
            }
        }

        // Auto-initialize with default config if not exists
        console.log('[CLI] rules-config.json이 없어 기본 설정으로 초기화합니다.');
        this.initRulesConfig();

        // Load the newly created config
        try {
            const data = this.fs.readFile(configPath);
            return JSON.parse(data);
        } catch (error) {
            console.warn('[CLI] 초기화된 설정을 로드할 수 없습니다. 빈 설정 반환.', error);
            return {};
        }
    }

    saveRulesConfig(config: RulesConfig): void {
        const validatedConfig = validateData(RulesConfigSchema, config, 'Invalid rules config');

        Object.keys(validatedConfig).forEach(toolId => {
            if (!this.getToolRulesFilename(toolId)) {
                throw new Error(`Unknown tool in rules-config: ${toolId}`);
            }
        });

        const masterDir = this.getMasterDir();
        if (!this.fs.exists(masterDir)) {
            this.fs.mkdir(masterDir);
        }

        const configPath = this.fs.join(masterDir, 'rules-config.json');
        this.fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    }

    private getToolRulesFilename(toolId: string): string | null {
        const meta = getToolMetadata(toolId);
        return meta?.rulesFilename || null;
    }

    async syncToolRules(toolId: string, targetPath: string, global: boolean = true, strategy: SyncStrategy = 'overwrite', backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<void> {
        const meta = getToolMetadata(toolId);
        if (!meta) {
            throw new Error(`Unknown tool: ${toolId}`);
        }

        let masterRules: string;

        if (sourceId) {
            const rule = await this.getRule(sourceId);
            if (!rule) {
                throw new Error(`Rule not found with ID: ${sourceId}`);
            }
            masterRules = rule.content;
            console.log(`[CLI] Syncing specific rule: ${rule.name} (${rule.id})`);
        } else {
            throw new Error('[CLI] Source ID (Rule ID) is required for synchronization.');
        }

        const filename = this.getToolRulesFilename(toolId);

        if (!filename) {
            console.log(`[CLI] Tool ${toolId} does not support rules sync, skipping`);
            return;
        }

        let fullPath: string;

        if (global) {
            const meta = getToolMetadata(toolId);
            const globalDir = meta?.globalRulesDir;
            if (!globalDir) {
                throw new Error(`Tool ${toolId} does not support global rules`);
            }
            if (!this.fs.exists(globalDir)) {
                this.fs.mkdir(globalDir);
            }
            fullPath = this.fs.join(globalDir, filename);
            console.log(`[CLI] 동기화 경로 결정됨: 도구 ID=${toolId}, 전역 룰=true, 최종 경로=${fullPath}`);
        } else {
            if (!targetPath) {
                throw new Error('Target path is required for project-level rules');
            }
            if (!this.fs.exists(targetPath)) {
                throw new Error(`Target path does not exist: ${targetPath}`);
            }
            fullPath = this.fs.join(targetPath, filename);
            console.log(`[CLI] 동기화 경로 결정됨: 도구 ID=${toolId}, 전역 룰=false, 최종 경로=${fullPath}`);
        }

        // 백업 (backup.ts는 아직 fs를 직접 사용하므로 그대로 둠, 추후 리팩토링 대상)
        console.log(`[CLI] DEBUG: ${toolId}: 백업 시작 - fullPath=${fullPath}`);
        createTimestampedBackup(fullPath, backupOptions);

        let currentContent = '';
        if (this.fs.exists(fullPath)) {
            currentContent = this.fs.readFile(fullPath);
            console.log(`[CLI] DEBUG: ${toolId}: 기존 파일 읽음 - 길이=${currentContent.length}`);
        } else {
            console.log(`[CLI] DEBUG: ${toolId}: 기존 파일 없음, 새로 생성`);
        }

        console.log(`[CLI] DEBUG: ${toolId}: masterRules 길이=${masterRules.length}`);
        const finalContent = applySyncStrategy(currentContent, masterRules, strategy);
        console.log(`[CLI] DEBUG: ${toolId}: 최종 컨텐츠 길이=${finalContent.length}, 전략=${strategy}`);

        // Drift Detection
        if (this.fs.exists(fullPath)) {
            try {
                const currentContent = this.fs.readFile(fullPath);
                const currentHash = this.checksumService.calculateStringChecksum(currentContent);
                const lastState = this.stateService.getState(fullPath);

                if (lastState && lastState.lastSyncHash !== currentHash) {
                    console.warn(`[CLI] ⚠️  WARNING: Drift detected in ${fullPath}`);
                    console.warn(`[CLI]    The file has been modified externally since the last sync.`);
                    console.warn(`[CLI]    Your changes will be overwritten. (Backup created if enabled)`);
                }
            } catch (e) {
                // Ignore read errors during drift check
            }
        }

        this.fs.writeFile(fullPath, finalContent);

        // Update state with new checksum
        const hash = this.checksumService.calculateStringChecksum(finalContent);
        this.stateService.updateState(fullPath, hash);

        // 성공 로그 (단일 동기화용)
        SyncLogger.logResult({
            type: 'rules',
            toolId,
            toolName: getToolMetadata(toolId)?.name || toolId,
            status: 'success',
            targetPath: fullPath,
            strategy,
        });
    }

    async syncAllToolsRules(targetPath: string, strategy: SyncStrategy = 'overwrite', sourceId?: string): Promise<RulesSyncResult[]> {
        const config = this.loadRulesConfig();
        const results: RulesSyncResult[] = [];
        const allTools = getRulesCapableTools();

        // sourceId가 없으면 에러 처리 (Stateless)
        if (!sourceId) {
            console.warn('[CLI] sourceId가 제공되지 않았습니다. 동기화를 위해서는 구체적인 Rule ID가 필요합니다.');
            console.warn('[CLI] sourceId가 제공되지 않았습니다. 동기화를 위해서는 구체적인 Rule ID가 필요합니다.');
            return [{
                toolId: 'global',
                toolName: 'System',
                status: 'error',
                message: 'Source ID(Rule ID) is required for stateless sync.',
                rulesFilename: ''
            }];
        }

        // 전체 동기화 시작 로그
        const enabledTools = allTools.filter(tool => {
            const toolConfig = config[tool.id];
            return toolConfig?.enabled !== false;
        });
        SyncLogger.logBatchSyncStart(enabledTools.length, 'rules');

        for (const tool of allTools) {
            const toolConfig = config[tool.id];
            // console.log(`[CLI] DEBUG: ${tool.id}: toolConfig=${JSON.stringify(toolConfig)}, targetPath=${targetPath}`);
            const toolName = tool.name;
            const rulesFilename = tool.rulesFilename!;

            const enabled = toolConfig ? toolConfig.enabled : true;

            if (toolConfig && toolConfig.enabled === false) {
                results.push({
                    toolId: tool.id,
                    toolName,
                    status: 'skipped',
                    message: '사용자가 동기화를 비활성화함',
                    rulesFilename,
                });
                continue;
            }

            try {
                const actualPath = toolConfig?.targetPath || targetPath;
                // global 결정: config에 명시 > targetPath 존재 여부 > 기본값(true)
                const isGlobal = toolConfig?.global !== undefined
                    ? toolConfig.global
                    : (actualPath ? false : true);
                // console.log(`[CLI] ${tool.id}: actualPath=${actualPath}, isGlobal=${isGlobal}`);

                if (!isGlobal && !actualPath) {
                    results.push({
                        toolId: tool.id,
                        toolName,
                        status: 'skipped',
                        message: '프로젝트 경로가 지정되지 않음 (--project 옵션 필요)',
                        rulesFilename,
                    });
                    continue;
                }

                let fullPath: string;
                if (isGlobal && tool.globalRulesDir) {
                    fullPath = this.fs.join(tool.globalRulesDir, rulesFilename);
                } else if (isGlobal && !tool.globalRulesDir) {
                    results.push({
                        toolId: tool.id,
                        toolName,
                        status: 'skipped',
                        message: '전역 Rules를 지원하지 않는 도구입니다',
                        rulesFilename,
                    });
                    continue;
                } else {
                    fullPath = this.fs.join(actualPath, rulesFilename);
                }

                // sourceId 전달
                await this.syncToolRules(tool.id, actualPath, isGlobal, strategy, undefined, sourceId);

                let displayPath = fullPath;
                if (!isGlobal && actualPath) {
                    const relativePath = this.fs.relative(process.cwd(), fullPath);
                    displayPath = relativePath.startsWith('..') ? fullPath : `./${relativePath}`;
                }

                results.push({
                    toolId: tool.id,
                    toolName,
                    status: 'success',
                    targetPath: displayPath,
                    rulesFilename,
                });
            } catch (error: any) {
                results.push({
                    toolId: tool.id,
                    toolName,
                    status: 'error',
                    message: error.message,
                    rulesFilename,
                });
            }
        }

        // 요약 로그 출력
        const logEntries = results.map(r => ({
            type: 'rules' as const,
            toolId: r.toolId,
            toolName: r.toolName,
            status: r.status === 'success' ? 'success' as const
                : r.status === 'error' ? 'error' as const
                    : r.status === 'not-supported' ? 'not-supported' as const
                        : 'skipped' as const,
            targetPath: r.targetPath,
            message: r.message,
        }));

        SyncLogger.logSummary(logEntries);

        try {
            saveVersion('sync', JSON.stringify(results, null, 2), 'Rules Sync Executed');
        } catch (e) {
            console.warn('[CLI] Failed to save rules sync history', e);
        }

        return results;
    }

    initRulesConfig(): void {
        const masterDir = this.getMasterDir();
        const configPath = this.fs.join(masterDir, 'rules-config.json');

        if (this.fs.exists(configPath)) {
            return;
        }

        const defaultConfig: RulesConfig = {};
        const rulesTools = getRulesCapableTools();

        for (const tool of rulesTools) {
            defaultConfig[tool.id] = {
                enabled: true,
                targetPath: '',
                global: true,
            };
        }

        this.saveRulesConfig(defaultConfig);
        console.log(`[CLI] rules-config.json이 생성되었습니다: ${configPath}`);
    }

    async getRulesConfig(): Promise<RulesConfig> {
        return this.repository.load();
    }

    listSupportedTools(): string[] {
        return getRulesCapableTools().map(t => t.id);
    }
}
