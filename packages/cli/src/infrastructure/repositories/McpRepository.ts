import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { McpDef, McpSet, McpSetItem } from '../../interfaces/IMcpService.js';
import { randomUUID } from 'crypto';

export class McpRepository {
    constructor(
        private fs: IFileSystem,
        private masterDir: string
    ) { }

    private getIndexPath(): string {
        // Use single index.json for both pool and sets (unified with mcp-multi.ts)
        return this.fs.join(this.masterDir, 'mcp', 'index.json');
    }

    private ensureMcpDir(): void {
        const mcpDir = this.fs.join(this.masterDir, 'mcp');
        if (!this.fs.exists(mcpDir)) {
            this.fs.mkdir(mcpDir);
        }
    }

    // MCP Definitions Management
    async getDefinitions(): Promise<McpDef[]> {
        const indexPath = this.getIndexPath();

        if (this.fs.exists(indexPath)) {
            try {
                const data = this.fs.readFile(indexPath);
                const json = JSON.parse(data);
                return json.pool || [];
            } catch (error) {
                console.error('Failed to parse MCP index:', error);
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
        const index = await this.loadIndex();

        const newDef: McpDef = {
            id: randomUUID(),
            ...def
        };

        index.pool.push(newDef);
        await this.saveIndex(index);

        return newDef;
    }

    async updateDefinition(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef> {
        const index = await this.loadIndex();
        const defIndex = index.pool.findIndex(d => d.id === id);

        if (defIndex === -1) {
            throw new Error(`MCP Definition not found: ${id}`);
        }

        index.pool[defIndex] = {
            ...index.pool[defIndex],
            ...updates
        };

        await this.saveIndex(index);
        return index.pool[defIndex];
    }

    async deleteDefinition(id: string): Promise<void> {
        const index = await this.loadIndex();
        const poolIndex = index.pool.findIndex(d => d.id === id);

        if (poolIndex === -1) {
            throw new Error(`MCP Definition not found: ${id}`);
        }

        // Remove from pool
        index.pool.splice(poolIndex, 1);

        // Remove references from all sets
        index.sets.forEach(set => {
            set.items = set.items.filter(item => item.serverId !== id);
        });

        await this.saveIndex(index);
    }

    private async loadIndex(): Promise<{ pool: McpDef[]; sets: McpSet[]; activeSetId: string | null }> {
        const indexPath = this.getIndexPath();

        if (this.fs.exists(indexPath)) {
            try {
                const data = this.fs.readFile(indexPath);
                const json = JSON.parse(data);
                return {
                    pool: json.pool || [],
                    sets: json.sets || [],
                    activeSetId: json.activeSetId || null
                };
            } catch (error) {
                console.error('Failed to parse MCP index:', error);
            }
        }

        return { pool: [], sets: [], activeSetId: null };
    }

    private async saveIndex(index: { pool: McpDef[]; sets: McpSet[]; activeSetId: string | null }): Promise<void> {
        this.ensureMcpDir();
        const indexPath = this.getIndexPath();
        const content = JSON.stringify(index, null, 2);
        this.fs.writeFile(indexPath, content);
    }

    // MCP Sets Management
    async getSets(): Promise<McpSet[]> {
        const index = await this.loadIndex();
        return index.sets;
    }

    async getSet(id: string): Promise<McpSet | null> {
        const sets = await this.getSets();
        return sets.find(s => s.id === id) || null;
    }

    async createSet(name: string, items: McpSetItem[], description?: string): Promise<McpSet> {
        this.ensureMcpDir();
        const index = await this.loadIndex();

        // If this is the first set, make it active
        const isActive = index.sets.length === 0;

        const newSet: McpSet = {
            id: randomUUID(),
            name,
            description,
            items,
            isActive,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        index.sets.push(newSet);
        if (isActive) {
            index.activeSetId = newSet.id;
        }
        await this.saveIndex(index);

        return newSet;
    }

    async updateSet(id: string, updates: { name?: string; description?: string; items?: McpSetItem[]; isArchived?: boolean }): Promise<McpSet> {
        const index = await this.loadIndex();
        const setIndex = index.sets.findIndex(s => s.id === id);

        if (setIndex === -1) {
            throw new Error(`MCP Set not found: ${id}`);
        }

        if (updates.name !== undefined) {
            index.sets[setIndex].name = updates.name;
        }
        if (updates.description !== undefined) {
            index.sets[setIndex].description = updates.description;
        }
        if (updates.items) {
            index.sets[setIndex].items = updates.items;
        }
        if (updates.isArchived !== undefined) {
            index.sets[setIndex].isArchived = updates.isArchived;
        }
        index.sets[setIndex].updatedAt = new Date().toISOString();

        await this.saveIndex(index);
        return index.sets[setIndex];
    }

    async deleteSet(id: string): Promise<void> {
        const index = await this.loadIndex();
        const setIndex = index.sets.findIndex(s => s.id === id);

        if (setIndex === -1) {
            throw new Error(`MCP Set not found: ${id}`);
        }

        if (index.sets[setIndex].isActive) {
            throw new Error('Cannot delete active MCP set');
        }

        const wasActive = index.sets[setIndex].isActive;
        index.sets.splice(setIndex, 1);

        if (wasActive) {
            index.activeSetId = null;
            if (index.sets.length > 0) {
                index.sets[0].isActive = true;
                index.activeSetId = index.sets[0].id;
            }
        }

        await this.saveIndex(index);
    }

    async setActiveSet(id: string): Promise<void> {
        const index = await this.loadIndex();
        const setIndex = index.sets.findIndex(s => s.id === id);

        if (setIndex === -1) {
            throw new Error(`MCP Set not found: ${id}`);
        }

        // Deactivate all
        index.sets.forEach(s => s.isActive = false);

        // Activate target
        index.sets[setIndex].isActive = true;
        index.activeSetId = id;

        await this.saveIndex(index);
    }

    // saveSets removed - now using unified saveIndex
}
