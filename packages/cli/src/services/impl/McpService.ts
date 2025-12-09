import os from 'os';
import { getConfigDir } from '../../constants/paths.js';
import { IMcpService, McpDef, McpSet, McpSetItem } from '../../interfaces/IMcpService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { McpRepository } from '../../infrastructure/repositories/McpRepository.js';

export class McpService implements IMcpService {
    private repository: McpRepository;
    private masterDir: string;

    constructor(private fs: IFileSystem, masterDir?: string) {
        this.masterDir = masterDir || this.getDefaultMasterDir();
        this.repository = new McpRepository(fs, this.masterDir);
    }

    private getDefaultMasterDir(): string {
        return getConfigDir();
    }

    public getMasterDir(): string {
        return this.masterDir;
    }

    public setMasterDir(dir: string): void {
        this.masterDir = dir;
        this.repository = new McpRepository(this.fs, dir);
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
}
