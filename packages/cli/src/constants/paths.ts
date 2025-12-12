import path from 'path';
import os from 'os';

export const CONFIG_DIR_NAME = '.align-agents';

/**
 * 설정 디렉토리 경로 반환
 * - 환경변수 ALIGN_AGENTS_CONFIG_DIR이 설정되면 해당 경로 사용 (테스트용)
 * - 그렇지 않으면 기본 경로 (~/.align-agents) 사용
 */
export function getConfigDir(): string {
    if (process.env.ALIGN_AGENTS_CONFIG_DIR) {
        return process.env.ALIGN_AGENTS_CONFIG_DIR;
    }
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
