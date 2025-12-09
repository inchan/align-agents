import fs from 'fs';
import path from 'path';
import os from 'os';
import { TOOL_METADATA } from '../constants/ToolDefinitions.js';

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
        this.registryPath = path.join(os.homedir(), '.ai-cli-syncer', 'registry.json');
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
        // Simple verification - maybe we don't want to hit FS for every tool on every load,
        // but for a CLI/Local app it's usually fine and ensures consistency.
        // Let's do it light - only check if we have configPath
        this.registry.tools = this.registry.tools.map(t => ({
            ...t,
            exists: t.configPath ? fs.existsSync(t.configPath) : false
        }));
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
            } else if (detectedPath) {
                // New tool detected - Add to registry
                this.registry.tools.push({
                    id: meta.id,
                    name: meta.name,
                    configPath: detectedPath,
                    exists: true,
                    // Add other defaults if needed, can be extended later
                });
                hasChanges = true;
            }
        }

        if (hasChanges) {
            await this.save();
        }
    }
}
