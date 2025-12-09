import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { ToolConfig, ToolRepository } from '../../repositories/ToolRepository.js';
import { getConfigDir } from '../../constants/paths.js';
import { ISyncService, MasterMcpConfig, SyncConfig, GlobalConfig, SyncResult, SyncResultStatus, SyncOptions } from '../../interfaces/ISyncService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { validateData } from '../../utils/validation.js';
import { MasterMcpConfigSchema, SyncConfigSchema } from '../../schemas/mcp.schema.js';
import { GlobalConfigSchema } from '../../schemas/rules.schema.js';
import { KNOWN_TOOLS, getToolMetadata } from '../../constants/tools.js';
import { SyncStrategy, deepMergeMcpServers } from '../strategies.js';
import { saveVersion } from '../history.js';
import { createTimestampedBackup } from '../../utils/backup.js';
import * as TOML from '@iarna/toml';

import { McpRepository } from '../../infrastructure/repositories/McpRepository.js';
import { McpService } from './McpService.js';
import { RulesService } from './RulesService.js';

import { ChecksumService } from './ChecksumService.js';
import { StateService } from './StateService.js';

export class SyncService implements ISyncService {
    private mcpRepository: McpRepository;
    private mcpService: McpService;
    private rulesService: RulesService;
    private checksumService: ChecksumService;
    private stateService: StateService;

    constructor(private fs: IFileSystem) {
        const masterDir = this.getMasterDir();
        this.mcpRepository = new McpRepository(fs, masterDir);
        this.mcpService = new McpService(fs, masterDir);
        this.rulesService = new RulesService(fs, masterDir);
        this.checksumService = new ChecksumService();
        this.stateService = new StateService();
    }



    private getPaths() {
        const masterDir = getConfigDir();
        const globalConfigDir = getConfigDir();
        return {
            defaultMasterDir: masterDir,
            globalConfigDir: globalConfigDir,
            globalConfigPath: this.fs.join(globalConfigDir, 'config.json'),
            legacyGlobalConfigPath: this.fs.join(masterDir, 'config.json')
        };
    }

    private getDefaultConfig(): GlobalConfig {
        return {
            masterDir: this.getPaths().defaultMasterDir,
            autoBackup: true,
        };
    }

    getGlobalConfig(): GlobalConfig {
        const paths = this.getPaths();
        const defaultConfig = this.getDefaultConfig();

        if (this.fs.exists(paths.globalConfigPath)) {
            try {
                const data = this.fs.readFile(paths.globalConfigPath);
                return { ...defaultConfig, ...JSON.parse(data) };
            } catch (error) {
                console.warn('[CLI] 전역 설정 파일을 읽을 수 없어 기본값으로 대체합니다.', error);
            }
        }

        if (this.fs.exists(paths.legacyGlobalConfigPath)) {
            try {
                const legacyData = JSON.parse(this.fs.readFile(paths.legacyGlobalConfigPath));
                const migrated = { ...defaultConfig, ...legacyData };
                this.saveGlobalConfig(migrated);
                console.warn(`[CLI] 레거시 전역 설정을 ${paths.globalConfigPath}로 마이그레이션했습니다.`);
                return migrated;
            } catch (error) {
                console.warn('[CLI] 레거시 전역 설정 마이그레이션에 실패하여 기본값을 사용합니다.', error);
            }
        }

        return defaultConfig;
    }

    saveGlobalConfig(config: GlobalConfig): void {
        const paths = this.getPaths();
        const validatedConfig = validateData(GlobalConfigSchema, config, 'Invalid global config');

        if (!this.fs.exists(paths.globalConfigDir)) {
            this.fs.mkdir(paths.globalConfigDir);
        }
        this.fs.writeFile(paths.globalConfigPath, JSON.stringify(validatedConfig, null, 2));
    }

    getMasterDir(): string {
        return this.getGlobalConfig().masterDir;
    }

    setMasterDir(dir: string): void {
        const config = this.getGlobalConfig();
        config.masterDir = dir;
        this.saveGlobalConfig(config);

        this.mcpRepository = new McpRepository(this.fs, dir);
        this.mcpService.setMasterDir(dir);
    }

    // Master MCP methods removed

    private getToolConfigPath(toolId: string): string | null {
        const meta = getToolMetadata(toolId);
        if (meta?.mcpConfigPath) {
            return meta.mcpConfigPath;
        }
        return meta?.configPaths?.[0] || null;
    }

    async syncTool(toolId: string, options: SyncOptions = {}): Promise<void> {
        console.log(`[CLI] Syncing tool: ${toolId}`);

        // 1. Sync MCP
        try {
            const toolConfigPath = this.getToolConfigPath(toolId);
            if (toolConfigPath) {
                await this.syncToolMcp(toolId, toolConfigPath, null, options.mcpStrategy || 'overwrite', options.backup);
            }
        } catch (error: any) {
            console.error(`[CLI] Failed to sync MCP for ${toolId}:`, error.message);
            throw error;
        }

        // 2. Sync Rules
        try {
            const config = this.rulesService.loadRulesConfig();
            const toolConfig = config[toolId];
            const targetPath = toolConfig?.targetPath || '';
            const global = toolConfig?.global !== undefined ? toolConfig.global : true;

            if (targetPath || global) {
                await this.rulesService.syncToolRules(toolId, targetPath, global, options.rulesStrategy || 'overwrite', options.backup);
            } else {
                console.log(`[CLI] Skipping rules sync for ${toolId}: No target path configured`);
            }
        } catch (error: any) {
            console.error(`[CLI] Failed to sync Rules for ${toolId}:`, error.message);
            throw error;
        }
    }

    loadSyncConfig(): SyncConfig {
        const masterDir = this.getMasterDir();
        const syncPath = this.fs.join(masterDir, 'sync-config.json');

        let parsed: any = {};
        if (this.fs.exists(syncPath)) {
            try {
                const data = this.fs.readFile(syncPath);
                parsed = JSON.parse(data);
            } catch {
                parsed = {};
            }
        }

        return this.normalizeSyncConfig(parsed);
    }

    saveSyncConfig(config: SyncConfig): void {
        const validatedConfig = validateData(SyncConfigSchema, config, 'Invalid sync config');

        for (const toolId of Object.keys(validatedConfig)) {
            const known = KNOWN_TOOLS.find(t => t.id === toolId);
            if (!known) {
                throw new Error(`Unknown tool in sync-config: ${toolId}`);
            }
        }

        const masterDir = this.getMasterDir();
        if (!this.fs.exists(masterDir)) {
            this.fs.mkdir(masterDir);
        }

        const syncPath = this.fs.join(masterDir, 'sync-config.json');
        this.fs.writeFile(syncPath, JSON.stringify(validatedConfig, null, 2));
    }

    private getDefaultSyncConfig(): SyncConfig {
        const defaults: SyncConfig = {};
        for (const tool of KNOWN_TOOLS) {
            const meta = getToolMetadata(tool.id);
            const supportsMcp = meta?.supportsMcp ?? true;
            defaults[tool.id] = { enabled: supportsMcp, servers: null };
        }
        return defaults;
    }

    private normalizeSyncConfig(raw: any): SyncConfig {
        if (raw && typeof raw === 'object' && raw.tools && typeof raw.tools === 'object') {
            raw = raw.tools;
        }

        const defaults = this.getDefaultSyncConfig();
        if (!raw || typeof raw !== 'object') {
            return defaults;
        }

        const result: SyncConfig = { ...defaults };

        for (const [toolId, value] of Object.entries(raw)) {
            if (!value || typeof value !== 'object') continue;
            const enabled = typeof (value as any).enabled === 'boolean' ? (value as any).enabled : true;
            const servers = Array.isArray((value as any).servers)
                ? (value as any).servers.filter((s: any) => typeof s === 'string')
                : null;

            result[toolId] = { enabled, servers };
        }

        return result;
    }

    async syncToolMcp(toolId: string, toolConfigPath: string, serverNames: string[] | null, strategy: SyncStrategy = 'overwrite', backupOptions?: { maxBackups?: number; skipBackup?: boolean }, sourceId?: string): Promise<string[]> {
        let masterMcpServers: Record<string, any> = {};

        if (!sourceId) {
            throw new Error('[CLI] Source ID (MCP Set ID) is required for synchronization.');
        }

        const mcpSet = await this.mcpRepository.getSet(sourceId);
        if (!mcpSet) {
            throw new Error(`MCP Set not found with ID: ${sourceId}`);
        }
        console.log(`[CLI] Syncing specific MCP Set: ${mcpSet.name} (${mcpSet.id})`);

        const definitions = await this.mcpRepository.getDefinitions();
        const defMap = new Map(definitions.map(d => [d.id, d]));

        for (const item of (mcpSet.items || [])) {
            if (item.disabled) continue;
            const def = defMap.get(item.serverId);
            if (def) {
                masterMcpServers[def.name] = {
                    command: def.command,
                    args: def.args,
                    env: def.env
                };
            }
        }

        const availableServers = Object.keys(masterMcpServers);
        if (availableServers.length === 0) {
            console.warn(`[CLI] ${toolId}: No valid MCP servers found in the selected set. Skipping sync.`);
            return [];
        }

        createTimestampedBackup(toolConfigPath, backupOptions);

        let toolConfig: any;
        let format: 'json' | 'toml' = 'json';

        if (!this.fs.exists(toolConfigPath)) {
            // File doesn't exist, ensure directory exists and start with empty config
            const dir = path.dirname(toolConfigPath);
            if (!this.fs.exists(dir)) {
                try {
                    this.fs.mkdir(dir);
                    console.log(`[CLI] Created directory: ${dir}`);
                } catch (e: any) {
                    console.warn(`[CLI] Failed to create directory ${dir}: ${e.message}`);
                    // Continue, maybe write will fail or directory actually exists
                }
            }
            toolConfig = {};
            format = toolConfigPath.toLowerCase().endsWith('.toml') ? 'toml' : 'json';
            console.log(`[CLI] Config file not found, creating new one at: ${toolConfigPath}`);
        } else {
            try {
                const raw = this.fs.readFile(toolConfigPath);
                format = toolConfigPath.toLowerCase().endsWith('.toml') ? 'toml' : 'json';
                toolConfig = format === 'toml' ? TOML.parse(raw) : JSON.parse(raw);
            } catch (error) {
                const label = format === 'toml' ? 'TOML' : 'JSON';
                throw new Error(`${label}으로 파싱할 수 없는 설정 파일: ${toolConfigPath}`);
            }
        }

        // Codex uses 'mcp_servers' (underscore) in TOML, others use 'mcpServers' (camelCase)
        const mcpKey = format === 'toml' ? 'mcp_servers' : 'mcpServers';

        if (!toolConfig[mcpKey]) {
            toolConfig[mcpKey] = {};
        }

        const selectedServers = serverNames === null ? availableServers : serverNames;

        const newMcpServers: Record<string, any> = {};
        for (const serverName of selectedServers) {
            if (masterMcpServers[serverName]) {
                newMcpServers[serverName] = masterMcpServers[serverName];
            }
        }

        if (Object.keys(newMcpServers).length === 0) {
            console.warn(`[CLI] ${toolId}: 적용할 MCP 서버가 없어 동기화를 건너뜁니다.`);
            return [];
        }

        const existingKeys = Object.keys(toolConfig[mcpKey] || {});

        if (strategy === 'overwrite') {
            // Overwrite strategy:
            // For TOML files, we must clean up legacy keys (mcpServers) if we are switching to new key (mcp_servers)
            // or simply ensure we don't have duplicate sections.
            // Since we are overwriting, we should remove known MCP keys and only set the active one.
            if (format === 'toml') {
                delete toolConfig['mcpServers'];
                delete toolConfig['mcp_servers'];
            }
            toolConfig[mcpKey] = newMcpServers;
        } else if (strategy === 'smart-update') {
            // Smart Update strategy:
            // 1. Iterate through new servers
            // 2. Check overlap with existing servers (by Name OR by Args deep equality)
            // 3. If overlap: Warning -> Remove Existing -> Add New
            // 4. If no overlap: Add New

            const currentServers = toolConfig[mcpKey] || {};
            const updatedServers = { ...currentServers };

            for (const [newServerName, newServerConfig] of Object.entries(newMcpServers)) {
                let isDuplicate = false;
                let duplicateKey = null;

                // Check for name collision
                if (updatedServers[newServerName]) {
                    isDuplicate = true;
                    duplicateKey = newServerName;
                } else {
                    // Check for args collision
                    for (const [existingName, existingConfig] of Object.entries(updatedServers)) {
                        const existingArgs = JSON.stringify((existingConfig as any).args || []);
                        const newArgs = JSON.stringify((newServerConfig as any).args || []);
                        if (existingArgs === newArgs) {
                            isDuplicate = true;
                            duplicateKey = existingName;
                            break;
                        }
                    }
                }

                if (isDuplicate && duplicateKey) {
                    console.log(`[CLI] Smart Update: Duplicate detected for '${newServerName}' (matches '${duplicateKey}'). Replaced.`);
                    // If name is different but content same, remove the old one (duplicateKey)
                    // If name is same, it gets overwritten anyway
                    if (duplicateKey !== newServerName) {
                        delete updatedServers[duplicateKey];
                    }
                }

                // Add/Overwrite with new config
                updatedServers[newServerName] = newServerConfig;
            }
            toolConfig[mcpKey] = updatedServers;
        } else {
            // Fallback to overwrite if unknown
            toolConfig[mcpKey] = newMcpServers;
        }

        const finalKeys = Object.keys(toolConfig[mcpKey] || {});
        const addedKeys = finalKeys.filter(k => !existingKeys.includes(k));
        const deletedKeys = existingKeys.filter(k => !finalKeys.includes(k));
        // For smart update, "deleted" might be technically "replaced", but strictly keys missing from final are deleted.
        // If we replaced 'old' with 'new', 'old' is deleted, 'new' is added.
        const keptKeys = existingKeys.filter(k => finalKeys.includes(k));



        console.log(chalk.cyan(`\n  ${chalk.bold('✔')} Sync Summary: ${chalk.bold(toolId)}`));
        if (keptKeys.length > 0) {
            console.log(chalk.gray(`    • Kept (${keptKeys.length}): ${keptKeys.join(', ')}`));
        }
        if (addedKeys.length > 0) {
            console.log(chalk.green(`    + Added (${addedKeys.length}): ${addedKeys.join(', ')}`));
        }
        if (deletedKeys.length > 0) {
            console.log(chalk.red(`    - Removed (${deletedKeys.length}): ${deletedKeys.join(', ')}`));
        }
        if (addedKeys.length === 0 && deletedKeys.length === 0) {
            console.log(chalk.gray(`    (No changes made)`));
        }
        console.log(''); // Empty line for spacing

        const serialized = format === 'toml'
            ? TOML.stringify(toolConfig)
            : JSON.stringify(toolConfig, null, 2);


        // Drift Detection
        if (this.fs.exists(toolConfigPath)) {
            try {
                const currentContent = this.fs.readFile(toolConfigPath);
                const currentHash = this.checksumService.calculateStringChecksum(currentContent);
                const lastState = this.stateService.getState(toolConfigPath);

                if (lastState && lastState.lastSyncHash !== currentHash) {
                    console.warn(`[CLI] ⚠️  WARNING: Drift detected in ${toolConfigPath}`);
                    console.warn(`[CLI]    The file has been modified externally since the last sync.`);
                    console.warn(`[CLI]    Your changes will be overwritten. (Backup created if enabled)`);
                }
            } catch (e) {
                // Ignore read errors during drift check
            }
        }

        this.fs.writeFile(toolConfigPath, serialized);

        const hash = this.checksumService.calculateStringChecksum(serialized);
        this.stateService.updateState(toolConfigPath, hash);

        return Object.keys(newMcpServers);
    }

    async syncAllTools(sourceId?: string, tools?: any[]): Promise<SyncResult[]> {
        const syncConfig = this.loadSyncConfig();
        const results: SyncResult[] = [];

        if (!sourceId) {
            console.warn('[CLI] sourceId가 제공되지 않았습니다. 동기화를 위해서는 구체적인 MCP Set ID가 필요합니다.');
            return [{
                toolId: 'global',
                name: 'System',
                path: '',
                status: 'error',
                message: 'Source ID(MCP Set ID) is required for stateless sync.'
            }];
        }

        // masterMcp 로드 제거하거나 sourceId 기반일 땐 무시

        let targetTools = tools;
        if (!targetTools) {
            const toolRepository = ToolRepository.getInstance();
            await toolRepository.load();
            targetTools = toolRepository.getTools();
        }

        for (const tool of targetTools) {
            if (!tool.exists) {
                results.push({ toolId: tool.id, name: tool.name, path: tool.configPath, status: 'skipped', message: '도구 미설치' });
                continue;
            }

            const meta = getToolMetadata(tool.id);
            if (meta?.supportsMcp === false) {
                results.push({ toolId: tool.id, name: tool.name, path: tool.configPath, status: 'unsupported', message: 'MCP 동기화 미지원 도구' });
                continue;
            }

            const toolSyncConfig = syncConfig[tool.id];
            if (!toolSyncConfig || !toolSyncConfig.enabled) {
                results.push({ toolId: tool.id, name: tool.name, path: tool.configPath, status: 'skipped', message: '동기화 비활성화' });
                continue;
            }

            try {
                // 특정 sourceId가 있으면 서버 목록 필터링은 의미가 약해짐 (Set 전체 동기화)
                // 하지만 기존 로직 유지: Set 내에서 선별할 수도 있음. 
                // 지금은 Set 전체를 동기화한다고 가정.
                const servers = toolSyncConfig.servers; // null이면 전체

                const correctPath = this.getToolConfigPath(tool.id) || tool.configPath;
                const applied = await this.syncToolMcp(tool.id, correctPath, servers, 'overwrite', undefined, sourceId);
                results.push({ toolId: tool.id, name: tool.name, path: correctPath, status: 'success', servers: applied });
            } catch (error: any) {
                results.push({ toolId: tool.id, name: tool.name, path: tool.configPath, status: 'error', message: error.message });
            }
        }

        try {
            saveVersion('sync', JSON.stringify(results, null, 2), 'Tools Sync Executed');
        } catch (e) {
            console.warn('[CLI] Failed to save sync history', e);
        }

        return results;
    }
    async getSyncConfig(): Promise<SyncConfig> {
        const configPath = this.fs.join(this.getMasterDir(), 'sync-config.json');
        if (this.fs.exists(configPath)) {
            try {
                return JSON.parse(this.fs.readFile(configPath));
            } catch (e) {
                console.warn('Failed to parse sync-config.json', e);
                return {};
            }
        }
        return {};
    }
}
