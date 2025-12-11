import { McpServer } from '../schemas/mcp.schema.js';

export type McpServerType = 'stdio' | 'http' | 'sse';

export interface McpDef {
    id: string;
    name: string;
    // stdio type fields
    command?: string;
    args?: string[];
    cwd?: string;
    // http/sse type fields
    type?: McpServerType;
    url?: string;
    // common fields
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
    orderIndex?: number;
    createdAt: string;
    updatedAt: string;
}

export interface IMcpService {
    // MCP Definitions Pool Management
    getMcpDefinitions(): Promise<McpDef[]>;
    getMcpDefinition(id: string): Promise<McpDef | null>;
    createMcpDefinition(def: Omit<McpDef, 'id'>): Promise<McpDef>;
    updateMcpDefinition(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef>;
    deleteMcpDefinition(id: string): Promise<void>;

    // MCP Sets Management
    getMcpSets(): Promise<McpSet[]>;
    getMcpSet(id: string): Promise<McpSet | null>;
    createMcpSet(name: string, items: McpSetItem[], description?: string): Promise<McpSet>;
    updateMcpSet(id: string, updates: { name?: string; description?: string; items?: McpSetItem[]; isArchived?: boolean }): Promise<McpSet>;
    deleteMcpSet(id: string): Promise<void>;
    setActiveMcpSet(id: string): Promise<void>;
    reorderMcpSets(ids: string[]): Promise<void>;
}
