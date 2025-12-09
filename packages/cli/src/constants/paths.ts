import path from 'path';
import os from 'os';

export const CONFIG_DIR_NAME = '.ai-cli-syncer';

export function getConfigDir(): string {
    return path.join(os.homedir(), CONFIG_DIR_NAME);
}

export function getMcpDir(): string {
    return path.join(getConfigDir(), 'mcp');
}

export function getRulesDir(): string {
    return path.join(getConfigDir(), 'rules');
}

export function getRegistryPath(): string {
    return path.join(getConfigDir(), 'registry.json');
}

export function getGlobalConfigPath(): string {
    return path.join(getConfigDir(), 'config.json');
}

export function getProjectsConfigPath(): string {
    return path.join(getConfigDir(), 'projects.json');
}

export function getToolsConfigPath(): string {
    return path.join(getConfigDir(), 'tools.json');
}

// Master MCP Path removed
