import fs from 'fs';
import path from 'path';
import os from 'os';

interface ToolState {
    lastSyncHash: string;
    lastSyncTime: string;
}

interface StateSchema {
    tools: {
        [configPath: string]: ToolState;
    };
}

export class StateService {
    private statePath: string;
    private state: StateSchema;

    constructor() {
        const homeDir = os.homedir();
        const configDir = path.join(homeDir, '.ai-cli-syncer');
        this.statePath = path.join(configDir, 'state.json');

        // Ensure config directory exists
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }

        this.state = this.loadState();
    }

    private loadState(): StateSchema {
        try {
            if (fs.existsSync(this.statePath)) {
                const content = fs.readFileSync(this.statePath, 'utf-8');
                return JSON.parse(content);
            }
        } catch (error) {
            // Ignore corrupted state file
        }
        return { tools: {} };
    }

    private saveState(): void {
        try {
            fs.writeFileSync(this.statePath, JSON.stringify(this.state, null, 2));
        } catch (error) {
            console.error('Failed to save state:', error);
        }
    }

    /**
     * Update the known checksum for a tool config file
     */
    updateState(configPath: string, hash: string): void {
        this.state.tools[configPath] = {
            lastSyncHash: hash,
            lastSyncTime: new Date().toISOString(),
        };
        this.saveState();
    }

    /**
     * Get the full state for a tool config file
     */
    getState(configPath: string): ToolState | null {
        return this.state.tools[configPath] || null;
    }

    /**
     * Get the last known checksum for a tool config file
     */
    getLastHash(configPath: string): string | null {
        return this.state.tools[configPath]?.lastSyncHash || null;
    }
}
