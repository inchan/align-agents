import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import os from 'os';
import { TOOL_METADATA } from '../constants/ToolDefinitions.js';
import { getRegistryPath } from '../constants/paths.js';

export interface ToolConfig {
    id: string;
    name: string;
    description?: string;
    configPath: string;
    platform?: string;
    url?: string;
    exists: boolean;
    // Dynamic fields from registry
    [key: string]: any;
}

export interface ToolRegistry {
    tools: ToolConfig[];
    lastScan?: string;
}

export class ToolRepository {
    private registryPath: string;
    private registry: ToolRegistry | null = null;
    private static instance: ToolRepository;

    private constructor() {
        this.registryPath = getRegistryPath();
    }

    public static getInstance(): ToolRepository {
        if (!ToolRepository.instance) {
            ToolRepository.instance = new ToolRepository();
        }
        return ToolRepository.instance;
    }

    public async load(): Promise<void> {
        if (fs.existsSync(this.registryPath)) {
            try {
                const data = await fs.promises.readFile(this.registryPath, 'utf-8');
                this.registry = JSON.parse(data);
                await this.scanAndRegisterTools(); // Auto-discover tools on load
                this.verifyTools();
            } catch (error) {
                console.error('Failed to load registry:', error);
                this.registry = { tools: [] };
            }
        } else {
            this.registry = { tools: [] };
            await this.scanAndRegisterTools();
        }
    }

    public getTools(): ToolConfig[] {
        if (!this.registry) {
            // Fallback if load() wasn't called, though it should be.
            // We can read synchronously here if forced, but better to rely on load()
            if (fs.existsSync(this.registryPath)) {
                try {
                    const data = fs.readFileSync(this.registryPath, 'utf-8');
                    this.registry = JSON.parse(data);
                } catch {
                    this.registry = { tools: [] };
                }
            } else {
                this.registry = { tools: [] };
            }
        }
        return this.registry?.tools || [];
    }

    public getTool(id: string): ToolConfig | undefined {
        return this.getTools().find(t => t.id === id);
    }

    // Merge static metadata with registry data
    public getToolMetadata(id: string) {
        const staticMeta = TOOL_METADATA.find(t => t.id === id);
        const dynamicMeta = this.getTool(id);

        if (!staticMeta && !dynamicMeta) return undefined;

        return {
            ...staticMeta,
            ...dynamicMeta,
            // Ensure static IDs and Names take precedence if needed, 
            // but dynamic exists status is crucial
        };
    }

    public async updateTool(id: string, updates: Partial<ToolConfig>): Promise<ToolConfig> {
        await this.load(); // Ensure latest

        if (!this.registry) this.registry = { tools: [] };

        const index = this.registry.tools.findIndex(t => t.id === id);
        if (index === -1) {
            throw new Error(`Tool with id ${id} not found`);
        }

        // Apply updates
        this.registry.tools[index] = { ...this.registry.tools[index], ...updates };

        // Auto-verify existence if configPath changes or explicitly requested
        if (updates.configPath || updates.exists === undefined) {
            this.registry.tools[index].exists = fs.existsSync(this.registry.tools[index].configPath);
        }

        await this.save();
        return this.registry.tools[index];
    }

    public async addTool(tool: ToolConfig): Promise<void> {
        await this.load();
        if (!this.registry) this.registry = { tools: [] };

        const existing = this.registry.tools.findIndex(t => t.id === tool.id);
        if (existing !== -1) {
            this.registry.tools[existing] = tool;
        } else {
            this.registry.tools.push(tool);
        }
        await this.save();
    }

    public async removeTool(id: string): Promise<boolean> {
        await this.load();
        if (!this.registry) return false;

        const initialLen = this.registry.tools.length;
        this.registry.tools = this.registry.tools.filter(t => t.id !== id);

        if (this.registry.tools.length !== initialLen) {
            await this.save();
            return true;
        }
        return false;
    }

    private async save(): Promise<void> {
        if (!this.registry) return;
        try {
            await fs.promises.writeFile(this.registryPath, JSON.stringify(this.registry, null, 2));
        } catch (error) {
            console.error('Failed to save registry:', error);
            throw error;
        }
    }

    private verifyTools() {
        if (!this.registry) return;

        this.registry.tools = this.registry.tools.map(t => {
            const hasConfig = t.configPath ? fs.existsSync(t.configPath) : false;
            if (hasConfig) {
                return { ...t, exists: true };
            }

            // If config missing, check if tool itself is installed (e.g. CLI/App exists)
            // We need full metadata for isToolInstalled
            const staticMeta = TOOL_METADATA.find(m => m.id === t.id);
            if (staticMeta && this.isToolInstalled({ ...staticMeta, ...t })) {
                return { ...t, exists: true };
            }

            return { ...t, exists: false };
        });
    }


    private isToolInstalled(meta: any): boolean {
        // Check App Path (macOS/specific)
        if (meta.appPath && fs.existsSync(meta.appPath)) {
            return true;
        }
        // Check CLI Command
        if (meta.cliCommand) {
            try {
                // 'which' works on macOS/Linux. For Windows 'where' might be needed.
                // Since user is mac, 'which' is fine.
                execSync(`which ${meta.cliCommand}`, { stdio: 'ignore' });
                return true;
            } catch (e) {
                return false;
            }
        }
        return false;
    }

    private async scanAndRegisterTools() {
        if (!this.registry) return;

        let hasChanges = false;

        for (const meta of TOOL_METADATA) {
            // Find first existing config path
            let detectedPath: string | null = null;
            for (const p of meta.configPaths) {
                if (fs.existsSync(p)) {
                    detectedPath = p;
                    break;
                }
            }

            const existingIndex = this.registry.tools.findIndex(t => t.id === meta.id);

            if (existingIndex !== -1) {
                // Update existing tool
                const tool = this.registry.tools[existingIndex];
                const exists = detectedPath !== null;

                if (tool.exists !== exists) {
                    tool.exists = exists;
                    hasChanges = true;
                }

                // If tool exists but has no config path set (or invalid), update it
                if (exists && detectedPath && (!tool.configPath || !fs.existsSync(tool.configPath))) {
                    tool.configPath = detectedPath;
                    hasChanges = true;
                }

                // Force update legacy paths:
                // If the current tool.configPath is NOT in the new meta.configPaths AND doesn't match mcpConfigPath,
                // we should migrate it to the new default.
                const normalizedCurrentPath = path.resolve(tool.configPath);
                const allowedPaths = meta.configPaths.map(p => path.resolve(p));
                if (meta.mcpConfigPath) {
                    allowedPaths.push(path.resolve(meta.mcpConfigPath));
                }

                const isValidPath = allowedPaths.includes(normalizedCurrentPath);

                if (!isValidPath) {
                    // Path is legacy or invalid. Update to default.
                    const newDefault = meta.mcpConfigPath || meta.configPaths[0];
                    if (newDefault && newDefault !== tool.configPath) {
                        console.log(`[CLI] Migrating legacy path for ${tool.name}: ${tool.configPath} -> ${newDefault}`);
                        tool.configPath = newDefault;
                        // Re-check existence at new path
                        tool.exists = fs.existsSync(newDefault) || this.isToolInstalled({ ...meta, configPath: newDefault });
                        hasChanges = true;
                    }
                }
            } else if (detectedPath) {
                // New tool detected via config presence
                this.registry.tools.push({
                    id: meta.id,
                    name: meta.name,
                    configPath: detectedPath,
                    exists: true,
                });
                hasChanges = true;
            } else if (this.isToolInstalled(meta)) {
                // Tool installed but config missing -> Register with default config path
                // Prefer mcpConfigPath (since we care about MCP) or first configPath
                const defaultPath = meta.mcpConfigPath || meta.configPaths[0];
                if (defaultPath) {
                    this.registry.tools.push({
                        id: meta.id,
                        name: meta.name,
                        configPath: defaultPath,
                        exists: true, // It "exists" as a tool, even if file is missing (SyncService handles file creation)
                    });
                    hasChanges = true;
                }
            }
        }

        if (hasChanges) {
            await this.save();
        }
    }
}
