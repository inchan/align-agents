// Tool types
export interface ToolConfig {
    id: string;
    name: string;
    configPath: string;
    exists: boolean;
    // New fields
    rulesPath?: string;
    mcpPath?: string;
}

export interface UserProject {
    id: string;
    path: string;
    name: string;
    source: 'vscode' | 'cursor' | 'windsurf' | 'manual';
    isAutoScanned: boolean;
    lastAccessed?: string;
    createdAt: string;
    updatedAt: string;
}

// MCP types
export interface McpServer {
    command: string;
    args: string[];
    description?: string;
    category?: string;
    env?: Record<string, string>;
    disabled?: boolean;
}

export interface MasterMcpConfig {
    mcpServers: Record<string, McpServer>;
}

export interface SyncConfig {
    [toolId: string]: {
        enabled: boolean;
        servers: string[] | null;
        mcpSetId?: string | null;
    };
}

export interface GlobalConfig {
    masterDir: string;
    autoBackup: boolean;
}

export interface RulesConfig {
    [toolId: string]: {
        enabled: boolean;
        targetPath: string;
        global: boolean;
        ruleId?: string;
    };
}

export interface ToolMetadata {
    id: string;
    name: string;
    configPaths: string[];
    format: 'json' | 'toml';
    supportsMcp?: boolean;
    rulesFilename?: string;
    globalRulesDir?: string;
    mcpConfigPath?: string;
}

const API_BASE = '/api';

// Tools API
export async function fetchTools(): Promise<ToolConfig[]> {
    const response = await fetch(`${API_BASE}/tools`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch tools');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : (data.tools || []);
}

// Config API
export async function fetchConfig(path: string): Promise<{ content: string }> {
    const response = await fetch(`${API_BASE}/config?path=${encodeURIComponent(path)}`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch config');
    }
    return response.json();
}

export async function saveConfig(path: string, content: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path, content }),
    });
    if (!response.ok) {
        throw new Error('Failed to save config');
    }
    return response.json();
}

// Scan Tools API
export async function scanTools(): Promise<ToolConfig[]> {
    const response = await fetch(`${API_BASE}/tools/scan`, {
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Failed to scan tools');
    }
    const data = await response.json();
    return Array.isArray(data) ? data : (data.tools || []);
}

// Sync Status API
export interface SyncStatus {
    rules: RulesConfig;
    mcp: SyncConfig;
}

export async function fetchSyncStatus(): Promise<SyncStatus> {
    const response = await fetch(`${API_BASE}/sync/status`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch sync status');
    }
    return response.json();
}

// Master MCP API
export async function fetchMasterMcp(): Promise<MasterMcpConfig> {
    const response = await fetch(`${API_BASE}/mcp/master`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch master MCP');
    }
    return response.json();
}

export async function saveMasterMcp(config: MasterMcpConfig): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/mcp/master`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
    });
    if (!response.ok) {
        throw new Error('Failed to save master MCP');
    }
    return response.json();
}



// Sync Result Types
export interface SyncResultItem {
    toolId: string;
    name?: string;
    status: 'success' | 'error' | 'skipped';
    message: string;
    path?: string;
    servers?: string[];
    strategy?: string;
    ruleName?: string;
    ruleContent?: string;
}

export interface SyncResult {
    success?: boolean;
    message?: string;
    results?: SyncResultItem[];
    toolId?: string;
    status?: 'success' | 'error' | 'skipped';
    path?: string;
}

// Sync Execution API (MCP)
// Sync Execution API (MCP)
export async function executeMcpSync(toolId?: string, sourceId?: string, strategy?: string, global: boolean = true, targetPath?: string): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/mcp/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolId, sourceId, strategy, global, targetPath }),
    });
    if (!response.ok) {
        throw new Error('Failed to execute MCP sync');
    }
    return response.json();
}



export interface ProjectInfo {
    path: string;
    name: string;
    source: 'vscode' | 'cursor' | 'windsurf';
    lastAccessed?: string;
}

export async function fetchRecentProjects(): Promise<ProjectInfo[]> {
    const response = await fetch(`${API_BASE}/tools/recent-projects`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch recent projects');
    }
    return response.json();
}

export async function pickProjectFolder(): Promise<{ path: string | null; cancelled?: boolean }> {
    const response = await fetch(`${API_BASE}/tools/pick-folder`, {
        method: 'POST',
        cache: 'no-store'
    });
    if (!response.ok) {
        throw new Error('Failed to pick folder');
    }
    return response.json();
}



// Master Rules API
export async function fetchMasterRules(): Promise<{ content: string }> {
    const response = await fetch(`${API_BASE}/rules/master`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch master rules');
    }
    return response.json();
}

export async function saveMasterRules(content: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/rules/master`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
    });
    if (!response.ok) {
        throw new Error('Failed to save master rules');
    }
    return response.json();
}

export async function executeRulesSync(toolId?: string, sourceId?: string, strategy?: string, global: boolean = true, targetPath?: string): Promise<SyncResult> {
    const response = await fetch(`${API_BASE}/rules/sync`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ toolId, sourceId, strategy, global, targetPath }),
    });
    if (!response.ok) {
        throw new Error('Failed to sync rules');
    }
    return response.json();
}



// Rules Config API
export async function fetchRulesConfig(): Promise<RulesConfig> {
    const response = await fetch(`${API_BASE}/rules-config`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch rules config');
    }
    return response.json();
}

export async function saveRulesConfig(config: RulesConfig): Promise<{ success: boolean }> {
    const response = await fetch(`${API_BASE}/rules-config`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
    });
    if (!response.ok) {
        throw new Error('Failed to save rules config');
    }
    return response.json();
}



export async function addTool(tool: { name: string; configPath: string; description?: string; format?: string }): Promise<ToolConfig> {
    const response = await fetch(`${API_BASE}/tools`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(tool),
    });
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add tool');
    }
    const data = await response.json();
    return data.tool;
}

// Tool metadata
export async function fetchToolMetadata(): Promise<ToolMetadata[]> {
    const response = await fetch(`${API_BASE}/tools-metadata`, { cache: 'no-store' });
    if (!response.ok) {
        throw new Error('Failed to fetch tool metadata');
    }
    return response.json();
}
// Multi-rules management API
export interface Rule {
    id: string;
    name: string;
    content: string;
    isActive: boolean;
    orderIndex?: number;
    createdAt: string;
    updatedAt: string;
}

export async function fetchRulesList(): Promise<Rule[]> {
    const response = await fetch(`${API_BASE}/rules`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch rules list');
    return response.json();
}

export async function createRule(name: string, content: string): Promise<Rule> {
    const response = await fetch(`${API_BASE}/rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, content }),
    });
    if (!response.ok) throw new Error('Failed to create rule');
    return response.json();
}

export async function updateRule(id: string, content: string, name?: string): Promise<Rule> {
    const response = await fetch(`${API_BASE}/rules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, name }),
    });
    if (!response.ok) throw new Error('Failed to update rule');
    return response.json();
}

export async function deleteRule(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/rules/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete rule');
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
}

export async function setActiveRule(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/rules/${id}/activate`, {
        method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to set active rule');
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
}

export async function reorderRules(ids: string[]): Promise<void> {
    const response = await fetch(`${API_BASE}/rules/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to reorder rules');
}
export interface StatsSummary {
    totalSyncs: number;
    lastSync: string | null;
    successCount: number;
    errorCount: number;
    historyCount: number;
}

export interface ActivityLog {
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
}

export async function fetchStatsSummary(): Promise<StatsSummary> {
    const response = await fetch(`${API_BASE}/stats/summary`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch stats summary');
    return response.json();
}

export async function fetchActivityFeed(): Promise<ActivityLog[]> {
    const response = await fetch(`${API_BASE}/stats/activity`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch activity feed');
    return response.json();
}

// MCP Pool API
export interface McpDef {
    id: string;
    name: string;
    command: string;
    args: string[];
    cwd?: string;
    description?: string;
    env?: Record<string, string>;
}

export async function fetchMcpPool(): Promise<McpDef[]> {
    const response = await fetch(`${API_BASE}/mcps`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch MCP pool');
    return response.json();
}

export async function createMcpDef(def: Omit<McpDef, 'id'>): Promise<McpDef> {
    const response = await fetch(`${API_BASE}/mcps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(def),
    });
    if (!response.ok) throw new Error('Failed to create MCP definition');
    return response.json();
}

export async function updateMcpDef(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef> {
    const response = await fetch(`${API_BASE}/mcps/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update MCP definition');
    return response.json();
}

export async function deleteMcpDef(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/mcps/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete MCP definition');
    return response.json();
}

// MCP Sets API
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

export async function fetchMcpSets(): Promise<McpSet[]> {
    const response = await fetch(`${API_BASE}/mcp-sets`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch MCP sets');
    return response.json();
}

export async function createMcpSet(name: string, items: McpSetItem[] = [], description?: string): Promise<McpSet> {
    const response = await fetch(`${API_BASE}/mcp-sets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, items, description }),
    });
    if (!response.ok) throw new Error('Failed to create MCP set');
    return response.json();
}

export async function updateMcpSet(id: string, updates: { name?: string, description?: string, items?: McpSetItem[], isArchived?: boolean }): Promise<McpSet> {
    const response = await fetch(`${API_BASE}/mcp-sets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update MCP set');
    return response.json();
}

export async function deleteMcpSet(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/mcp-sets/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete MCP set');
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
}

export async function setActiveMcpSet(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/mcp-sets/${id}/activate`, {
        method: 'PUT',
    });
    if (!response.ok) throw new Error('Failed to set active MCP set');
    const text = await response.text();
    return text ? JSON.parse(text) : undefined;
}

export async function reorderMcpSets(ids: string[]): Promise<void> {
    const response = await fetch(`${API_BASE}/mcp-sets/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to reorder MCP sets');
}

// Projects API
export async function fetchProjects(): Promise<UserProject[]> {
    const response = await fetch(`${API_BASE}/projects`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch projects');
    return response.json();
}

export async function createProject(project: Partial<UserProject>): Promise<UserProject> {
    const response = await fetch(`${API_BASE}/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
    });
    if (!response.ok) {
        let errorMsg = 'Failed to create project';
        try {
            const data = await response.json();
            if (data.error) errorMsg = data.error;
        } catch (e) {
            // ignore
        }
        throw new Error(errorMsg);
    }
    return response.json();
}

export async function updateProject(id: string, updates: Partial<UserProject>): Promise<UserProject> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update project');
    return response.json();
}

export async function deleteProject(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete project');
}

export async function scanProjects(): Promise<UserProject[]> {
    const response = await fetch(`${API_BASE}/projects/scan`, {
        method: 'POST',
    });
    if (!response.ok) throw new Error('Failed to scan projects');
    return response.json();
}

export async function reorderProjects(ids: string[]): Promise<void> {
    const response = await fetch(`${API_BASE}/projects/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error('Failed to reorder projects');
}

// Tools Enhancement API
export async function updateTool(id: string, updates: Partial<ToolConfig>): Promise<ToolConfig> {
    const response = await fetch(`${API_BASE}/tools/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Failed to update tool');
    return response.json();
}

export async function deleteTool(id: string): Promise<void> {
    const response = await fetch(`${API_BASE}/tools/${id}`, {
        method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete tool');
}

export async function checkToolHelp(id: string): Promise<string> {
    const response = await fetch(`${API_BASE}/tools/${id}/check-help`, {
        method: 'POST',
    });
    const data = await response.json();
    return data.output || 'No output';
}

export interface ProjectDetails {
    id: string;
    path: string;
    tools: {
        id: string;
        name: string;
        hasRules: boolean;
        hasMcp: boolean;
        files: { type: string, path: string, exists: boolean }[];
        globalConfig: {
            rulesPath: string | null;
            mcpPath: string | null;
            supported: boolean;
            rulesExists: boolean;
            mcpExists: boolean;
        };
    }[];
}

export async function fetchProjectDetails(id: string): Promise<ProjectDetails> {
    const response = await fetch(`${API_BASE}/projects/${id}/details`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch project details');
    return response.json();
}
