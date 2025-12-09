import { ToolLoaderService } from '../services/ToolLoaderService.js';
import { TOOL_METADATA, ToolMetadata } from './ToolDefinitions.js';

export * from './ToolDefinitions.js';

let loader: ToolLoaderService | null = null;
function getLoader() {
    if (!loader) loader = new ToolLoaderService();
    return loader;
}

export const KNOWN_TOOLS = TOOL_METADATA.map(tool => ({
    id: tool.id,
    name: tool.name,
    category: tool.category,
    paths: tool.configPaths,
    appPath: tool.appPath,
    cliCommand: tool.cliCommand,
    supportsMcp: tool.supportsMcp,
}));

export function getToolMetadata(toolId: string): ToolMetadata | undefined {
    return getLoader().getTool(toolId);
}

export function getRulesCapableTools(): ToolMetadata[] {
    return getLoader().getRulesCapableTools();
}

