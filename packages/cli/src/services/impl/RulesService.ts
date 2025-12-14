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
import { getDatabase } from '../../infrastructure/database.js';
import {
    ToolNotFoundError,
    NotFoundError,
    ValidationError,
    RulesSyncError,
    FileSystemError,
} from '@align-agents/errors';


/**
 * Rules(에이전트 규칙) 관리 및 동기화 서비스.
 * SQLite 기반의 RulesConfigRepository를 통해 Rules를 영속화한다.
 */
export class RulesService implements IRulesService {
    private repository: RulesConfigRepository;
    private masterDir: string;
    private checksumService: ChecksumService;
    private stateService: StateService;

    constructor(private fs: IFileSystem, masterDir?: string) {
        this.masterDir = masterDir || this.getDefaultMasterDir();
        const db = getDatabase();
        this.repository = new RulesConfigRepository(db);
        this.checksumService = new ChecksumService();
        this.stateService = new StateService();
    }

    private getDefaultMasterDir(): string {
        return getConfigDir();
    }

    private getMasterDir(): string {
        return this.masterDir;
    }

    public setMasterDir(dir: string): void {
        this.masterDir = dir;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Multi-rules management
    // ─────────────────────────────────────────────────────────────────────────

    /** 모든 Rule 목록을 조회한다. */
    async getRulesList(): Promise<Rule[]> {
        return this.repository.getRulesList();
    }

    /** 특정 Rule을 조회한다. */
    async getRule(id: string): Promise<Rule | null> {
        return this.repository.getRule(id);
    }

    /** 새 Rule을 생성한다. */
    async createRule(name: string, content: string): Promise<Rule> {
        return this.repository.createRule(name, content);
    }

    /** Rule을 수정한다. */
    async updateRule(id: string, content: string, name?: string): Promise<Rule> {
        return this.repository.updateRule(id, content, name);
    }

    /** Rule을 삭제한다. */
    async deleteRule(id: string): Promise<void> {
        return this.repository.deleteRule(id);
    }

    /** 특정 Rule을 활성 상태로 설정한다. */
    async setActiveRule(id: string): Promise<void> {
        return this.repository.setActiveRule(id);
    }

    /** 특정 Rule을 비활성 상태로 설정한다. */
    async deactivateRule(id: string): Promise<void> {
        return this.repository.deactivateRule(id);
    }

    /** Rule 순서를 재정렬한다. */
    async reorderRules(ids: string[]): Promise<void> {
        return this.repository.reorderRules(ids);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Rules Config Management
    // ─────────────────────────────────────────────────────────────────────────

    /** Rules 설정을 로드한다. */
    async loadRulesConfig(): Promise<RulesConfig> {
        return this.repository.load();
    }

    /** Rules 설정을 저장한다. */
    async saveRulesConfig(config: RulesConfig): Promise<void> {
        const validatedConfig = validateData(RulesConfigSchema, config, 'Invalid rules config');

        Object.keys(validatedConfig).forEach(toolId => {
            if (!this.getToolRulesFilename(toolId)) {
                throw new ToolNotFoundError(toolId);
            }
        });

        return this.repository.save(validatedConfig);
    }

    /** 도구 ID에 해당하는 Rules 파일명을 반환한다. */
    private getToolRulesFilename(toolId: string): string | null {
        const meta = getToolMetadata(toolId);
        return meta?.rulesFilename || null;
    }

    /**
     * 특정 도구에 Rule을 동기화한다.
     * @param toolId - 대상 도구 ID
     * @param targetPath - 프로젝트 경로 (프로젝트 모드 시)
     * @param global - 전역 Rules 사용 여부 (기본: true)
     * @param strategy - 동기화 전략 (기본: 'overwrite')
     * @param backupOptions - 백업 옵션
     * @param sourceId - Rule ID (필수)
     * @throws Error - 알 수 없는 도구, sourceId 누락 등
     */
    async syncToolRules(toolId: string, targetPath: string, global: boolean = true, strategy: SyncStrategy = 'overwrite', backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<void> {
        const meta = getToolMetadata(toolId);
        if (!meta) {
            throw new ToolNotFoundError(toolId);
        }

        let masterRules: string;

        if (sourceId) {
            const rule = await this.getRule(sourceId);
            if (!rule) {
                throw new NotFoundError('Rule', sourceId);
            }
            masterRules = rule.content;
            console.log(`[CLI] Syncing specific rule: ${rule.name} (${rule.id})`);
        } else {
            throw new ValidationError('Source ID (Rule ID) is required for synchronization');
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
                throw new RulesSyncError(toolId, 'Tool does not support global rules');
            }
            if (!this.fs.exists(globalDir)) {
                this.fs.mkdir(globalDir);
            }
            fullPath = this.fs.join(globalDir, filename);
            console.log(`[CLI] 동기화 경로 결정됨: 도구 ID=${toolId}, 전역 룰=true, 최종 경로=${fullPath}`);
        } else {
            if (!targetPath) {
                throw new ValidationError('Target path is required for project-level rules');
            }
            if (!this.fs.exists(targetPath)) {
                throw new FileSystemError(`Target path does not exist: ${targetPath}`, targetPath);
            }
            fullPath = this.fs.join(targetPath, filename);
            console.log(`[CLI] 동기화 경로 결정됨: 도구 ID=${toolId}, 전역 룰=false, 최종 경로=${fullPath}`);
        }

        // 백업
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

        // Save ruleId to config
        if (sourceId) {
            try {
                const currentConfig = await this.loadRulesConfig();
                if (currentConfig[toolId]) {
                    currentConfig[toolId].ruleId = sourceId;
                    await this.saveRulesConfig(currentConfig);
                }
            } catch (e) {
                console.warn(`[CLI] Failed to save ruleId to config for ${toolId}:`, e);
            }
        }
    }

    /**
     * 모든 도구에 Rule을 동기화한다.
     * @param targetPath - 프로젝트 경로
     * @param strategy - 동기화 전략 (기본: 'overwrite')
     * @param sourceId - Rule ID (필수)
     * @returns 각 도구별 동기화 결과 배열
     */
    async syncAllToolsRules(targetPath: string, strategy: SyncStrategy = 'overwrite', sourceId?: string): Promise<RulesSyncResult[]> {
        const config = await this.loadRulesConfig();
        const results: RulesSyncResult[] = [];
        const allTools = getRulesCapableTools();

        // sourceId가 없으면 에러 처리 (Stateless)
        if (!sourceId) {
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
            const toolName = tool.name;
            const rulesFilename = tool.rulesFilename!;

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

                // sourceId 전달 - DO NOT pass empty string for sourceId, it's checked inside syncToolRules
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

    /** Rules 설정을 초기화한다. 이미 설정이 있으면 무시한다. */
    async initRulesConfig(): Promise<void> {
        const current = await this.loadRulesConfig();
        if (Object.keys(current).length > 0) return;

        const defaultConfig: RulesConfig = {};
        const rulesTools = getRulesCapableTools();

        for (const tool of rulesTools) {
            defaultConfig[tool.id] = {
                enabled: true,
                targetPath: '',
                global: true,
            };
        }

        await this.saveRulesConfig(defaultConfig);
    }

    /** 현재 Rules 설정을 조회한다. */
    async getRulesConfig(): Promise<RulesConfig> {
        return this.repository.load();
    }

    /** 지원되는 도구 ID 목록을 반환한다. */
    listSupportedTools(): string[] {
        return getRulesCapableTools().map(t => t.id);
    }
}
