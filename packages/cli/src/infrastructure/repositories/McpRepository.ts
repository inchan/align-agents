import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { McpDef, McpSet, McpSetItem } from '../../interfaces/IMcpService.js';
import { randomUUID } from 'crypto';

export class McpRepository {
    constructor(
        private fs: IFileSystem,
        private masterDir: string
    ) { }

    private getDefinitionsPath(): string {
        return this.fs.join(this.masterDir, 'mcp', 'definitions.json');
    }

    private getSetsPath(): string {
        return this.fs.join(this.masterDir, 'mcp', 'sets.json');
    }

    private ensureMcpDir(): void {
        const mcpDir = this.fs.join(this.masterDir, 'mcp');
        if (!this.fs.exists(mcpDir)) {
            this.fs.mkdir(mcpDir);
        }
    }

    // MCP Definitions Management
    async getDefinitions(): Promise<McpDef[]> {
        const defsPath = this.getDefinitionsPath();

        if (this.fs.exists(defsPath)) {
            try {
                const data = this.fs.readFile(defsPath);
                const json = JSON.parse(data);
                return json.definitions || [];
            } catch (error) {
                console.error('Failed to parse MCP definitions:', error);
                return [];
            }
        }

        return [];
    }

    async getDefinition(id: string): Promise<McpDef | null> {
        const definitions = await this.getDefinitions();
        return definitions.find(d => d.id === id) || null;
    }

    async createDefinition(def: Omit<McpDef, 'id'>): Promise<McpDef> {
        this.ensureMcpDir();
        const definitions = await this.getDefinitions();

        const newDef: McpDef = {
            id: randomUUID(),
            ...def
        };

        definitions.push(newDef);
        await this.saveDefinitions(definitions);

        return newDef;
    }

    async updateDefinition(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef> {
        const definitions = await this.getDefinitions();
        const index = definitions.findIndex(d => d.id === id);

        if (index === -1) {
            throw new Error(`MCP Definition not found: ${id}`);
        }

        definitions[index] = {
            ...definitions[index],
            ...updates
        };

        await this.saveDefinitions(definitions);
        return definitions[index];
    }

    async deleteDefinition(id: string): Promise<void> {
        const definitions = await this.getDefinitions();
        const newDefinitions = definitions.filter(d => d.id !== id);

        if (newDefinitions.length === definitions.length) {
            throw new Error(`MCP Definition not found: ${id}`);
        }

        await this.saveDefinitions(newDefinitions);
    }

    private async saveDefinitions(definitions: McpDef[]): Promise<void> {
        this.ensureMcpDir();
        const defsPath = this.getDefinitionsPath();
        const content = JSON.stringify({ definitions }, null, 2);
        this.fs.writeFile(defsPath, content);
    }

    // MCP Sets Management
    async getSets(): Promise<McpSet[]> {
        const setsPath = this.getSetsPath();

        if (this.fs.exists(setsPath)) {
            try {
                const data = this.fs.readFile(setsPath);
                const json = JSON.parse(data);
                return json.sets || [];
            } catch (error) {
                console.error('Failed to parse MCP sets:', error);
                return [];
            }
        }

        return [];
    }

    async getSet(id: string): Promise<McpSet | null> {
        const sets = await this.getSets();
        return sets.find(s => s.id === id) || null;
    }

    async createSet(name: string, items: McpSetItem[], description?: string): Promise<McpSet> {
        this.ensureMcpDir();
        const sets = await this.getSets();

        // If this is the first set, make it active
        const isActive = sets.length === 0;

        const newSet: McpSet = {
            id: randomUUID(),
            name,
            description,
            items,
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        sets.push(newSet);
        await this.saveSets(sets);

        return newSet;
    }

    async updateSet(id: string, updates: { name?: string; description?: string; items?: McpSetItem[]; isArchived?: boolean }): Promise<McpSet> {
        const sets = await this.getSets();
        const index = sets.findIndex(s => s.id === id);

        if (index === -1) {
            throw new Error(`MCP Set not found: ${id}`);
        }

        if (updates.name !== undefined) {
            sets[index].name = updates.name;
        }
        if (updates.description !== undefined) {
            sets[index].description = updates.description;
        }
        if (updates.items) {
            sets[index].items = updates.items;
        }
        if (updates.isArchived !== undefined) {
            sets[index].isArchived = updates.isArchived;
        }
        sets[index].updatedAt = new Date().toISOString();

        await this.saveSets(sets);
        return sets[index];
    }

    async deleteSet(id: string): Promise<void> {
        const sets = await this.getSets();
        const set = sets.find(s => s.id === id);

        if (!set) {
            throw new Error(`MCP Set not found: ${id}`);
        }

        if (set.isActive) {
            throw new Error('Cannot delete active MCP set');
        }

        const newSets = sets.filter(s => s.id !== id);
        await this.saveSets(newSets);
    }

    async setActiveSet(id: string): Promise<void> {
        const sets = await this.getSets();
        const index = sets.findIndex(s => s.id === id);

        if (index === -1) {
            throw new Error(`MCP Set not found: ${id}`);
        }

        // Deactivate all
        sets.forEach(s => s.isActive = false);

        // Activate target
        sets[index].isActive = true;

        await this.saveSets(sets);
    }

    private async saveSets(sets: McpSet[]): Promise<void> {
        this.ensureMcpDir();
        const setsPath = this.getSetsPath();
        const content = JSON.stringify({ sets }, null, 2);
        this.fs.writeFile(setsPath, content);
    }
}
