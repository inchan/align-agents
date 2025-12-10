import os from 'os';
import { getConfigDir } from '../../constants/paths.js';
import { IMcpService, McpDef, McpSet, McpSetItem } from '../../interfaces/IMcpService.js';
import { McpRepository } from '../../infrastructure/repositories/McpRepository.js';
import { getDatabase } from '../../infrastructure/database.js';

export class McpService implements IMcpService {
    private repository: McpRepository;
    private masterDir: string;

    constructor(masterDir?: string) {
        this.masterDir = masterDir || this.getDefaultMasterDir();
        const db = getDatabase();
        this.repository = new McpRepository(db);
    }

    private getDefaultMasterDir(): string {
        return getConfigDir();
    }

    public getMasterDir(): string {
        return this.masterDir;
    }

    public setMasterDir(dir: string): void {
        this.masterDir = dir;
        // Repository doesn't need to be recreated as it uses global DB instance
    }

    // MCP Definitions Pool Management
    async getMcpDefinitions(): Promise<McpDef[]> {
        return this.repository.getDefinitions();
    }

    async getMcpDefinition(id: string): Promise<McpDef | null> {
        return this.repository.getDefinition(id);
    }

    async createMcpDefinition(def: Omit<McpDef, 'id'>): Promise<McpDef> {
        return this.repository.createDefinition(def);
    }

    async updateMcpDefinition(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef> {
        return this.repository.updateDefinition(id, updates);
    }

    async deleteMcpDefinition(id: string): Promise<void> {
        return this.repository.deleteDefinition(id);
    }

    // MCP Sets Management
    async getMcpSets(): Promise<McpSet[]> {
        return this.repository.getSets();
    }

    async getMcpSet(id: string): Promise<McpSet | null> {
        return this.repository.getSet(id);
    }

    async createMcpSet(name: string, items: McpSetItem[], description?: string): Promise<McpSet> {
        return this.repository.createSet(name, items, description);
    }

    async updateMcpSet(id: string, updates: { name?: string; description?: string; items?: McpSetItem[] }): Promise<McpSet> {
        return this.repository.updateSet(id, updates);
    }

    async deleteMcpSet(id: string): Promise<void> {
        return this.repository.deleteSet(id);
    }

    async setActiveMcpSet(id: string): Promise<void> {
        return this.repository.setActiveSet(id);
    }

    async reorderMcpSets(ids: string[]): Promise<void> {
        return this.repository.reorderMcpSets(ids);
    }
}
