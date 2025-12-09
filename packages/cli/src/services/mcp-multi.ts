import fs from 'fs'
import path from 'path'
import os from 'os'
import { v4 as uuidv4 } from 'uuid'

// --- Data Models ---

export interface McpDef {
    id: string;
    name: string;
    command: string;
    args: string[];
    description?: string;
    env?: Record<string, string>;
}

export interface McpSetItem {
    serverId: string;
    disabled?: boolean;
}

export interface McpSet {
    id: string;
    name: string;
    description?: string;
    items: McpSetItem[];
    isActive: boolean;
    isArchived?: boolean;
    createdAt: string;
    updatedAt: string;
}

interface McpIndex {
    pool: McpDef[];
    sets: McpSet[];
    activeSetId: string | null;
}

// --- Legacy Types for Migration ---
interface LegacyMcpServer {
    command: string;
    args: string[];
    env?: Record<string, string>;
    disabled?: boolean;
}
interface LegacyMcpSet {
    id: string;
    name: string;
    servers: Record<string, LegacyMcpServer>;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}
interface LegacyMcpIndex {
    sets: LegacyMcpSet[];
    activeSetId: string | null;
}

const MCP_DIR = path.join(os.homedir(), '.ai-cli-syncer', 'mcp')
const MCP_INDEX_PATH = path.join(MCP_DIR, 'index.json')
const MASTER_MCP_PATH = path.join(os.homedir(), '.ai-cli-syncer', 'master-mcp.json')

// Ensure mcp directory exists
function ensureMcpDir() {
    if (!fs.existsSync(MCP_DIR)) {
        fs.mkdirSync(MCP_DIR, { recursive: true })
    }
}

// Load mcp index with migration support
function loadIndex(): McpIndex {
    ensureMcpDir()

    if (!fs.existsSync(MCP_INDEX_PATH)) {
        // Initial Migration from master-mcp.json
        return migrateFromMasterMcp();
    }

    const content = fs.readFileSync(MCP_INDEX_PATH, 'utf-8')
    if (!content.trim()) {
        return { pool: [], sets: [], activeSetId: null }
    }

    try {
        const data = JSON.parse(content);
        // Check if it's the old format (has 'sets' but no 'pool', and sets have 'servers' record)
        if (data.sets && !data.pool && data.sets.length > 0 && data.sets[0].servers) {
            return migrateFromLegacyIndex(data as LegacyMcpIndex);
        }
        // Ensure pool exists
        if (!data.pool) data.pool = [];
        return data as McpIndex;
    } catch (e) {
        console.error('Failed to parse mcp index:', e)
        return { pool: [], sets: [], activeSetId: null }
    }
}

function migrateFromMasterMcp(): McpIndex {
    const pool: McpDef[] = [];
    const items: McpSetItem[] = [];

    if (fs.existsSync(MASTER_MCP_PATH)) {
        try {
            const masterContent = JSON.parse(fs.readFileSync(MASTER_MCP_PATH, 'utf-8'));
            const servers = masterContent.mcpServers || {};

            for (const [name, config] of Object.entries(servers) as [string, any][]) {
                const def: McpDef = {
                    id: uuidv4(),
                    name: name,
                    command: config.command,
                    args: config.args || [],
                    env: config.env
                };
                pool.push(def);
                items.push({ serverId: def.id, disabled: false });
            }
        } catch (e) {
            console.error('Failed to migrate master-mcp.json:', e);
        }
    }

    const defaultSet: McpSet = {
        id: uuidv4(),
        name: 'Default Set',
        items: items,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const index: McpIndex = {
        pool,
        sets: [defaultSet],
        activeSetId: defaultSet.id
    };

    saveIndex(index);
    return index;
}

function migrateFromLegacyIndex(legacy: LegacyMcpIndex): McpIndex {
    console.log('Migrating from legacy MCP index...');
    const pool: McpDef[] = [];
    const newSets: McpSet[] = [];

    // Helper to find existing def in pool
    const findInPool = (server: LegacyMcpServer, name: string) => {
        return pool.find(d =>
            d.name === name &&
            d.command === server.command &&
            JSON.stringify(d.args) === JSON.stringify(server.args) &&
            JSON.stringify(d.env) === JSON.stringify(server.env)
        );
    };

    for (const oldSet of legacy.sets) {
        const newItems: McpSetItem[] = [];

        for (const [name, server] of Object.entries(oldSet.servers)) {
            let def = findInPool(server, name);
            if (!def) {
                def = {
                    id: uuidv4(),
                    name: name,
                    command: server.command,
                    args: server.args,
                    env: server.env
                };
                pool.push(def);
            }
            newItems.push({ serverId: def.id, disabled: server.disabled });
        }

        newSets.push({
            id: oldSet.id,
            name: oldSet.name,
            items: newItems,
            isActive: oldSet.isActive,
            createdAt: oldSet.createdAt,
            updatedAt: oldSet.updatedAt
        });
    }

    const newIndex: McpIndex = {
        pool,
        sets: newSets,
        activeSetId: legacy.activeSetId
    };

    saveIndex(newIndex);
    return newIndex;
}

// Save mcp index
function saveIndex(index: McpIndex) {
    ensureMcpDir()
    fs.writeFileSync(MCP_INDEX_PATH, JSON.stringify(index, null, 2))
}



// --- Global Pool Operations ---

export function fetchMcpPool(): McpDef[] {
    return loadIndex().pool;
}

export function createMcpDef(def: Omit<McpDef, 'id'>): McpDef {
    const index = loadIndex();
    const newDef = { ...def, id: uuidv4() };
    index.pool.push(newDef);
    saveIndex(index);
    return newDef;
}

export function updateMcpDef(id: string, updates: Partial<Omit<McpDef, 'id'>>): McpDef {
    const index = loadIndex();
    const def = index.pool.find(p => p.id === id);
    if (!def) throw new Error(`McpDef not found: ${id}`);

    Object.assign(def, updates);
    saveIndex(index);



    return def;
}

export function deleteMcpDef(id: string): void {
    const index = loadIndex();
    const poolIndex = index.pool.findIndex(p => p.id === id);
    if (poolIndex === -1) throw new Error(`McpDef not found: ${id}`);

    // Remove from pool
    index.pool.splice(poolIndex, 1);

    // Remove references from all sets
    index.sets.forEach(set => {
        set.items = set.items.filter(item => item.serverId !== id);
    });

    saveIndex(index);

}

// --- Set Operations ---

export function fetchMcpSets(): McpSet[] {
    return loadIndex().sets;
}

export function createMcpSet(name: string, items: McpSetItem[] = [], description?: string): McpSet {
    console.log('[MCP] Creating set:', name, description);
    const index = loadIndex();
    const newSet: McpSet = {
        id: uuidv4(),
        name,
        description,
        items,
        isActive: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    index.sets.push(newSet);

    // If first set, activate it
    if (index.sets.length === 1) {
        newSet.isActive = true;
        index.activeSetId = newSet.id;

    }

    saveIndex(index);
    return newSet;
}

export function updateMcpSet(id: string, updates: { name?: string, description?: string, items?: McpSetItem[], isArchived?: boolean }): McpSet {
    const index = loadIndex();
    const set = index.sets.find(s => s.id === id);
    if (!set) throw new Error(`McpSet not found: ${id}`);

    if (updates.name) set.name = updates.name;
    if (updates.description !== undefined) set.description = updates.description;
    if (updates.items) set.items = updates.items;
    if (updates.isArchived !== undefined) set.isArchived = updates.isArchived;
    set.updatedAt = new Date().toISOString();

    saveIndex(index);

    return set;
}

export function deleteMcpSet(id: string): void {
    const index = loadIndex();
    const setIndex = index.sets.findIndex(s => s.id === id);
    if (setIndex === -1) throw new Error(`McpSet not found: ${id}`);

    const wasActive = index.sets[setIndex].isActive;
    index.sets.splice(setIndex, 1);

    if (wasActive) {
        index.activeSetId = null;
        if (index.sets.length > 0) {
            const nextSet = index.sets[0];
            nextSet.isActive = true;
            index.activeSetId = nextSet.id;
        }

    }

    saveIndex(index);
}

export function setActiveMcpSet(id: string): void {
    const index = loadIndex();
    const set = index.sets.find(s => s.id === id);
    if (!set) throw new Error(`McpSet not found: ${id}`);

    index.sets.forEach(s => s.isActive = false);
    set.isActive = true;
    index.activeSetId = id;

    saveIndex(index);

}

