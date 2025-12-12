/**
 * Database schema SQL for initial setup
 */
export const INITIAL_SCHEMA = `
-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL,
    description TEXT
);

-- MCP Definitions Pool
-- Supports both stdio (command/args) and HTTP/SSE (type/url) types
CREATE TABLE IF NOT EXISTS mcp_definitions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    -- stdio type fields (nullable for HTTP/SSE)
    command TEXT,
    args TEXT,
    cwd TEXT,
    -- HTTP/SSE type fields
    type TEXT,  -- 'stdio', 'http', 'sse' (NULL defaults to stdio)
    url TEXT,
    -- common fields
    description TEXT,
    env TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_definitions_name ON mcp_definitions(name);
CREATE INDEX IF NOT EXISTS idx_mcp_definitions_created_at ON mcp_definitions(created_at);
CREATE INDEX IF NOT EXISTS idx_mcp_definitions_is_archived ON mcp_definitions(is_archived);

-- MCP Sets
CREATE TABLE IF NOT EXISTS mcp_sets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_active INTEGER NOT NULL DEFAULT 0,
    is_archived INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mcp_sets_is_active ON mcp_sets(is_active);
CREATE INDEX IF NOT EXISTS idx_mcp_sets_is_archived ON mcp_sets(is_archived);

-- MCP Set Items (Many-to-Many relationship)
CREATE TABLE IF NOT EXISTS mcp_set_items (
    id TEXT PRIMARY KEY,
    set_id TEXT NOT NULL,
    server_id TEXT NOT NULL,
    disabled INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (set_id) REFERENCES mcp_sets(id) ON DELETE CASCADE,
    FOREIGN KEY (server_id) REFERENCES mcp_definitions(id) ON DELETE CASCADE,
    UNIQUE(set_id, server_id)
);

CREATE INDEX IF NOT EXISTS idx_mcp_set_items_set_id ON mcp_set_items(set_id);
CREATE INDEX IF NOT EXISTS idx_mcp_set_items_server_id ON mcp_set_items(server_id);

-- Rules
CREATE TABLE IF NOT EXISTS rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    is_archived INTEGER NOT NULL DEFAULT 0,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rules_is_active ON rules(is_active);
CREATE INDEX IF NOT EXISTS idx_rules_is_archived ON rules(is_archived);
CREATE INDEX IF NOT EXISTS idx_rules_name ON rules(name);

-- Sync Config
CREATE TABLE IF NOT EXISTS sync_config (
    tool_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    servers TEXT,
    updated_at TEXT NOT NULL
);

-- Rules Config
CREATE TABLE IF NOT EXISTS rules_config (
    tool_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 1,
    target_path TEXT NOT NULL,
    global INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL
);

-- Global Config (Key-Value store)
CREATE TABLE IF NOT EXISTS global_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);
`;

/**
 * Insert initial schema version
 */
export const INITIAL_VERSION_INSERT = `
INSERT OR IGNORE INTO schema_version (version, applied_at, description)
VALUES (1, datetime('now'), 'Initial schema');
`;
