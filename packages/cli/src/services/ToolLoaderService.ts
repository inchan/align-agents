import fs from 'fs';
import os from 'os';
import path from 'path';
import { DEFAULT_TOOLS, ToolMetadata } from '../constants/ToolDefinitions.js';

export interface ToolsConfig {
    tools: ToolMetadata[];
}

export class ToolLoaderService {
    private tools: ToolMetadata[] = [];
    private loaded = false;

    constructor() {
        this.loadTools();
    }

    private loadTools(): void {
        // 1. Load built-in tools
        const builtInTools = [...DEFAULT_TOOLS];

        // 2. Load custom tools from config
        const customTools = this.loadCustomTools();

        // 3. Merge tools (Custom overrides built-in by ID)
        const toolMap = new Map<string, ToolMetadata>();

        builtInTools.forEach(tool => toolMap.set(tool.id, tool));
        customTools.forEach(tool => {
            // Expand paths for custom tools
            const expandedTool = this.expandToolPaths(tool);
            toolMap.set(tool.id, expandedTool);
        });

        this.tools = Array.from(toolMap.values());
        this.loaded = true;
    }

    private loadCustomTools(): ToolMetadata[] {
        const configPaths = [
            path.join(os.homedir(), '.config', 'ai-cli-syncer', 'tools.json'),
            path.join(os.homedir(), '.ai-cli-syncer', 'tools.json')
        ];

        for (const configPath of configPaths) {
            if (fs.existsSync(configPath)) {
                try {
                    const content = fs.readFileSync(configPath, 'utf-8');
                    const config = JSON.parse(content) as ToolsConfig;
                    if (Array.isArray(config.tools)) {
                        console.log(`[CLI] Loaded custom tools from ${configPath}`);
                        return config.tools;
                    }
                } catch (error) {
                    console.warn(`[CLI] Failed to load custom tools from ${configPath}:`, error);
                }
            }
        }

        return [];
    }

    private expandPath(p: string): string {
        if (p.startsWith('~')) {
            return path.join(os.homedir(), p.slice(1));
        }
        return p.replace('${HOME}', os.homedir());
    }

    private expandToolPaths(tool: ToolMetadata): ToolMetadata {
        return {
            ...tool,
            configPaths: tool.configPaths.map(p => this.expandPath(p)),
            mcpConfigPath: tool.mcpConfigPath ? this.expandPath(tool.mcpConfigPath) : undefined,
            globalRulesDir: tool.globalRulesDir ? this.expandPath(tool.globalRulesDir) : undefined,
            appPath: tool.appPath ? this.expandPath(tool.appPath) : undefined
        };
    }

    getTools(): ToolMetadata[] {
        if (!this.loaded) {
            this.loadTools();
        }
        return this.tools;
    }

    getTool(id: string): ToolMetadata | undefined {
        return this.getTools().find(t => t.id === id);
    }

    getRulesCapableTools(): ToolMetadata[] {
        return this.getTools().filter(t => Boolean(t.rulesFilename));
    }
}
