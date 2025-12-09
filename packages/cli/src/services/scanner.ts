import fs from 'fs';
import path from 'path';
import os from 'os';
import { KNOWN_TOOLS } from '../constants/tools.js';

export interface ToolConfig {
    id: string;
    name: string;
    configPath: string;
    exists: boolean;
}

export async function scanForTools(): Promise<ToolConfig[]> {
    const results: ToolConfig[] = [];
    const { execSync } = await import('child_process');

    for (const tool of KNOWN_TOOLS) {
        let foundPath = '';
        let exists = false;

        // 1. Config File Check (Primary)
        for (const p of tool.paths) {
            if (fs.existsSync(p)) {
                foundPath = p;
                exists = true;
                break;
            }
        }

        // 2. App Bundle Check (Secondary)
        if (!exists && tool.appPath) {
            if (fs.existsSync(tool.appPath)) {
                exists = true;
                // If config doesn't exist but app does, we still need a config path to write to.
                // We use the first default path.
                foundPath = tool.paths[0];
            }
        }

        // 3. CLI Command Check (Tertiary)
        if (!exists && tool.cliCommand) {
            try {
                execSync(`which ${tool.cliCommand}`, { stdio: 'ignore' });
                exists = true;
                // If config doesn't exist but CLI does, we use the first default path.
                foundPath = tool.paths[0];
            } catch (e) {
                // Command not found
            }
        }

        // Set default config path for tools that support MCP (for future config creation)
        if (!foundPath && (tool as any).supportsMcp) {
            foundPath = tool.paths[0];
        }

        results.push({
            id: tool.id,
            name: tool.name,
            configPath: foundPath,
            exists,
        });
    }

    return results;
}

export function saveRegistry(tools: ToolConfig[]) {
    const registryDir = path.join(os.homedir(), '.ai-cli-syncer');
    if (!fs.existsSync(registryDir)) {
        fs.mkdirSync(registryDir, { recursive: true });
    }
    const registryPath = path.join(registryDir, 'registry.json');
    fs.writeFileSync(registryPath, JSON.stringify({ tools, lastScan: new Date().toISOString() }, null, 2));
    return registryPath;
}

export { KNOWN_TOOLS };
