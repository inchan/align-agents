import fs from 'fs';
import os from 'os';
import path from 'path';
import { DEFAULT_TOOLS, ToolMetadata } from '../constants/ToolDefinitions.js';
import { getToolsConfigPath } from '../constants/paths.js';

/** 도구 설정 파일 인터페이스 */
export interface ToolsConfig {
    tools: ToolMetadata[];
}

/**
 * AI 도구 메타데이터 로딩 서비스.
 * 기본 제공 도구와 사용자 정의 도구를 병합하여 제공한다.
 */
export class ToolLoaderService {
    private tools: ToolMetadata[] = [];
    private loaded = false;

    constructor() {
        this.loadTools();
    }

    /**
     * 기본 도구와 사용자 정의 도구를 로드하여 병합한다.
     * 사용자 정의 도구가 기본 도구를 ID로 오버라이드한다.
     */
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

    /** 사용자 정의 도구 설정 파일에서 도구 목록을 로드한다. */
    private loadCustomTools(): ToolMetadata[] {
        const configPaths = [
            getToolsConfigPath()
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

    /** 경로 문자열에서 ~ 또는 ${HOME}을 홈 디렉토리로 확장한다. */
    private expandPath(p: string): string {
        if (p.startsWith('~')) {
            return path.join(os.homedir(), p.slice(1));
        }
        return p.replace('${HOME}', os.homedir());
    }

    /** 도구의 모든 경로 속성을 확장한다. */
    private expandToolPaths(tool: ToolMetadata): ToolMetadata {
        return {
            ...tool,
            configPaths: tool.configPaths.map(p => this.expandPath(p)),
            mcpConfigPath: tool.mcpConfigPath ? this.expandPath(tool.mcpConfigPath) : undefined,
            globalRulesDir: tool.globalRulesDir ? this.expandPath(tool.globalRulesDir) : undefined,
            appPath: tool.appPath ? this.expandPath(tool.appPath) : undefined
        };
    }

    /**
     * 모든 도구 메타데이터를 반환한다.
     * @returns ToolMetadata 배열
     */
    getTools(): ToolMetadata[] {
        if (!this.loaded) {
            this.loadTools();
        }
        return this.tools;
    }

    /**
     * 특정 ID의 도구 메타데이터를 반환한다.
     * @param id - 도구 ID
     * @returns ToolMetadata 또는 undefined
     */
    getTool(id: string): ToolMetadata | undefined {
        return this.getTools().find(t => t.id === id);
    }

    /**
     * Rules 동기화를 지원하는 도구 목록을 반환한다.
     * @returns rulesFilename이 정의된 도구 배열
     */
    getRulesCapableTools(): ToolMetadata[] {
        return this.getTools().filter(t => Boolean(t.rulesFilename));
    }
}
