import os from 'os';
import path from 'path';
import chalk from 'chalk';
import { ToolConfig, ToolRepository } from '../../repositories/ToolRepository.js';
import { getConfigDir } from '../../constants/paths.js';
import { ISyncService, SyncOptions, SyncResult, SyncResultStatus } from '../../interfaces/ISyncService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { SyncConfig, GlobalConfig } from '../../interfaces/ISyncService.js';
import { validateData } from '../../utils/validation.js';
import { KNOWN_TOOLS, getToolMetadata } from '../../constants/tools.js';
import { SyncStrategy } from '../strategies.js';
import { GlobalConfigSchema } from '../../schemas/rules.schema.js';
import { SyncConfigSchema } from '../../schemas/mcp.schema.js';
import { saveVersion } from '../history.js';
import { createTimestampedBackup } from '../../utils/backup.js';
import * as TOML from '@iarna/toml';

// Debug 모드 체크 (환경변수)
const isDebugMode = () => process.env.DEBUG === 'true' || process.env.LOG_LEVEL === 'debug';

const debugLog = (message: string, data?: any) => {
    if (isDebugMode()) {
        const timestamp = new Date().toISOString();
        console.log(`[${timestamp}] [SyncService:DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
};

import { McpRepository } from '../../infrastructure/repositories/McpRepository.js';
import { McpService } from './McpService.js';
import { RulesService } from './RulesService.js';
import { getDatabase } from '../../infrastructure/database.js';
import { SyncConfigRepository } from '../../infrastructure/repositories/SyncConfigRepository.js';
import { GlobalConfigRepository } from '../../infrastructure/repositories/GlobalConfigRepository.js';

import { ChecksumService } from './ChecksumService.js';
import { StateService } from './StateService.js';

export class SyncService implements ISyncService {
    private mcpRepository: McpRepository;
    private mcpService: McpService;
    private rulesService: RulesService;
    private syncConfigRepository: SyncConfigRepository;
    private globalConfigRepository: GlobalConfigRepository;
    private checksumService: ChecksumService;
    private stateService: StateService;

    constructor(private fs: IFileSystem) {
        const db = getDatabase();

        // Initialize with default config first
        const defaultConfig = this.getDefaultConfig();
        this.globalConfigRepository = new GlobalConfigRepository(db, defaultConfig);
        const masterDir = defaultConfig.masterDir;

        this.mcpRepository = new McpRepository(db);
        this.mcpService = new McpService(masterDir);
        this.rulesService = new RulesService(fs, masterDir);
        this.syncConfigRepository = new SyncConfigRepository(db);
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

    async getGlobalConfig(): Promise<GlobalConfig> {
        return this.globalConfigRepository.load();
    }

    async saveGlobalConfig(config: GlobalConfig): Promise<void> {
        const validatedConfig = validateData(GlobalConfigSchema, config, 'Invalid global config');
        return this.globalConfigRepository.save(validatedConfig);
    }

    async getMasterDir(): Promise<string> {
        const config = await this.getGlobalConfig();
        return config.masterDir;
    }

    async setMasterDir(dir: string): Promise<void> {
        const config = await this.getGlobalConfig();
        config.masterDir = dir;
        await this.saveGlobalConfig(config);

        // Repository uses global DB instance, no need to recreate
        this.mcpService.setMasterDir(dir);
        this.rulesService.setMasterDir(dir);
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

            let sourceId = options.sourceId; // Assuming SyncOptions has this, strictly typed interface might need update if it doesn't.
            // But syncTool signature in ISyncService might not have it exposed? 
            // The syncTool signature in SyncService.ts line 107 is (toolId: string, options: SyncOptions = {}).
            // Let's assume options has it or casts.

            if (!sourceId) {
                const syncConfig = await this.loadSyncConfig();
                if (syncConfig[toolId]?.mcpSetId) {
                    sourceId = syncConfig[toolId].mcpSetId;
                }
            }

            if (toolConfigPath) {
                await this.syncToolMcp(toolId, toolConfigPath, null, options.mcpStrategy || 'overwrite', options.backup, sourceId as string);
            }
        } catch (error: any) {
            console.error(`[CLI] Failed to sync MCP for ${toolId}:`, error.message);
            throw error;
        }

        // 2. Sync Rules
        try {
            const config = await this.rulesService.loadRulesConfig();
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

    async loadSyncConfig(): Promise<SyncConfig> {
        const repoConfig = await this.syncConfigRepository.load();

        // Load all available tools (including custom ones)
        const toolRepository = ToolRepository.getInstance();
        await toolRepository.load();
        const allTools = toolRepository.getTools();

        // Merge defaults for any tool missing in the repo config
        const mergedConfig: SyncConfig = { ...repoConfig };
        for (const tool of allTools) {
            if (!mergedConfig[tool.id]) {
                const meta = getToolMetadata(tool.id);
                const supportsMcp = meta?.supportsMcp ?? true;
                mergedConfig[tool.id] = { enabled: supportsMcp, servers: null };
            }
        }

        return mergedConfig;
    }

    async saveSyncConfig(config: SyncConfig): Promise<void> {
        const validatedConfig = validateData(SyncConfigSchema, config, 'Invalid sync config');

        for (const toolId of Object.keys(validatedConfig)) {
            const meta = getToolMetadata(toolId);
            if (!meta) {
                throw new Error(`Unknown tool in sync-config: ${toolId}`);
            }
        }
        return this.syncConfigRepository.save(validatedConfig);
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

        debugLog(`syncToolMcp started`, { toolId, toolConfigPath, strategy, sourceId });

        if (!sourceId) {
            throw new Error('[CLI] Source ID (MCP Set ID) is required for synchronization.');
        }

        const mcpSet = await this.mcpRepository.getSet(sourceId);
        if (!mcpSet) {
            console.warn(`[CLI] Warning: MCP Set not found with ID: ${sourceId}. Skipping MCP sync for this tool.`);
            return [];
        }
        debugLog(`MCP Set found`, { name: mcpSet.name, id: mcpSet.id, itemCount: mcpSet.items?.length || 0 });

        const definitions = await this.mcpRepository.getDefinitions();
        const defMap = new Map(definitions.map(d => [d.id, d]));

        for (const item of (mcpSet.items || [])) {
            if (item.disabled) continue;
            const def = defMap.get(item.serverId);
            if (def) {
                // HTTP/SSE 타입과 stdio 타입 구분
                if (def.type === 'http' || def.type === 'sse') {
                    masterMcpServers[def.name] = {
                        type: def.type,
                        url: def.url,
                        ...(def.env && Object.keys(def.env).length > 0 && { env: def.env })
                    };
                } else {
                    // stdio 타입 (기본)
                    masterMcpServers[def.name] = {
                        command: def.command,
                        args: def.args,
                        ...(def.env && Object.keys(def.env).length > 0 && { env: def.env })
                    };
                }
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
        // Check metadata first
        const meta = getToolMetadata(toolId);
        const mcpKey = meta?.mcpConfigKey || (format === 'toml' ? 'mcp_servers' : 'mcpServers');

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



        const isProjectLevel = sourceId && toolConfigPath.includes(sourceId); // Crude check, or better check if path matches global or project
        // Actually we don't know easily if it's user or project from here without more context, 
        // but we can infer from path location usually.
        // Let's just print the path.

        console.log(chalk.cyan(`\n  ${chalk.bold('✔')} Sync Summary: ${chalk.bold(toolId)}`));

        // meta is already defined above
        // If the path matches any of the known global paths, it's Global.
        const isGlobal = meta?.configPaths.some(p => path.resolve(p) === path.resolve(toolConfigPath))
            || meta?.mcpConfigPath && path.resolve(meta.mcpConfigPath) === path.resolve(toolConfigPath);

        const targetType = isGlobal ? 'Global' : 'Project';

        console.log(chalk.gray(`    • Target: ${targetType}`));
        console.log(chalk.gray(`    • Config Path: ${toolConfigPath}`));
        if (keptKeys.length > 0) {
            console.log(chalk.gray(`    • Kept (${keptKeys.length}): ${keptKeys.join(', ')}`));
        }
        if (addedKeys.length > 0) {
            console.log(chalk.green(`    + Added (${addedKeys.length}): ${addedKeys.join(', ')}`));
        }
        if (deletedKeys.length > 0) {
            console.log(chalk.red(`    - Removed (${deletedKeys.length}): ${deletedKeys.join(', ')}`));
        }
        // 변경사항이 없으면 스킵 (파일 쓰기 불필요)
        if (addedKeys.length === 0 && deletedKeys.length === 0) {
            console.log(chalk.yellow(`    ⏭ Already synced - no changes needed`));
            console.log('');
            debugLog(`Skipping file write - no changes detected`, { toolId, toolConfigPath });
            return Object.keys(newMcpServers);
        }
        console.log('');

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
                    debugLog(`Drift detected`, {
                        toolConfigPath,
                        currentHash,
                        lastSyncHash: lastState.lastSyncHash
                    });
                }
            } catch (e) {
                debugLog(`Drift check failed`, { error: (e as Error).message });
            }
        }

        this.fs.writeFile(toolConfigPath, serialized);
        debugLog(`File written`, { toolConfigPath, bytesWritten: serialized.length });

        const hash = this.checksumService.calculateStringChecksum(serialized);
        this.stateService.updateState(toolConfigPath, hash);

        // Save mcpSetId to config
        if (sourceId) {
            try {
                const currentConfig = await this.loadSyncConfig();
                // Ensure entry exists (it usually does if enabled, but good to be safe)
                if (!currentConfig[toolId]) {
                    // Create minimal config if missing? Or just skip?
                    // Should exist if enabled, or if defaults loaded previously.
                    // If not found, we shouldn't fail the sync, but saving ID is good practice.
                    // Let's assume we can fetch defaults or use empty if not found, 
                    // but safer to only update if exists or we just loaded it.
                    // Actually loadSyncConfig merges defaults.
                }

                if (!currentConfig[toolId]) {
                    currentConfig[toolId] = { enabled: true, servers: null };
                }

                currentConfig[toolId].mcpSetId = sourceId;
                await this.saveSyncConfig(currentConfig);
            } catch (e) {
                console.warn(`[CLI] Failed to save mcpSetId to config for ${toolId}:`, e);
            }
        }

        return Object.keys(newMcpServers);
    }

    async syncAllTools(sourceId?: string, tools?: any[]): Promise<SyncResult[]> {
        const syncConfig = await this.loadSyncConfig();
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
        return this.loadSyncConfig();
    }
}
