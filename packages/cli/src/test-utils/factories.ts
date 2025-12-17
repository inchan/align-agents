/**
 * Test Factories for E2E Tests
 * Centralizes data seeding logic for database setup
 */

/**
 * Minimal DB interface for test factories
 * Uses only the methods actually needed, avoiding transaction type complexity
 */
interface TestDb {
    exec(sql: string): void;
    prepare<T = any>(sql: string): { run(...params: any[]): any; get(...params: any[]): T | undefined; all(...params: any[]): T[] };
}

export const factories = {
    seedMcpData: (db: TestDb, mcpSetId: string, defId: string) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS mcp_definitions (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                command TEXT,
                args TEXT,
                cwd TEXT,
                type TEXT,
                url TEXT,
                description TEXT,
                env TEXT,
                is_archived INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
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
        `);

        db.prepare(`
            INSERT INTO mcp_definitions (id, name, command, args, env, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(defId, 'server1', 'node', JSON.stringify(['server.js']), '{}');

        db.prepare(`
            INSERT INTO mcp_sets (id, name, is_active, is_archived, created_at, updated_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `).run(mcpSetId, 'E2E Test Set', 1, 0);

        db.prepare(`
            INSERT INTO mcp_set_items (id, set_id, server_id, disabled, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
        `).run('item-1', mcpSetId, defId, 0, 0);
    },

    seedRulesData: (db: TestDb, ruleId: string, content: string = '# E2E Rules\n- keep me') => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS rules (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                content TEXT NOT NULL,
                is_archived INTEGER NOT NULL DEFAULT 0,
                order_index INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
        `);

        db.prepare(`
            INSERT INTO rules (id, name, content, created_at, updated_at)
            VALUES (?, ?, ?, datetime('now'), datetime('now'))
        `).run(ruleId, 'E2E Test Rule', content);
    },

    seedSyncConfig: (db: TestDb, config: Record<string, { enabled: boolean; servers: any | null }>) => {
        db.exec(`
            CREATE TABLE IF NOT EXISTS sync_config (
                tool_id TEXT PRIMARY KEY,
                enabled INTEGER NOT NULL DEFAULT 1,
                servers TEXT,
                updated_at TEXT NOT NULL
            );
        `);

        const insertStmt = db.prepare(`
            INSERT OR REPLACE INTO sync_config (tool_id, enabled, servers, updated_at)
            VALUES (?, ?, ?, datetime('now'))
        `);

        for (const [toolId, cfg] of Object.entries(config)) {
            insertStmt.run(toolId, cfg.enabled ? 1 : 0, cfg.servers ? JSON.stringify(cfg.servers) : null);
        }
    },

    seedGlobalConfig: (db: TestDb, config: Record<string, string>) => {
        db.exec(`CREATE TABLE IF NOT EXISTS global_config (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT)`);
        const stmt = db.prepare(`INSERT OR REPLACE INTO global_config (key, value) VALUES (?, ?)`);
        for (const [key, value] of Object.entries(config)) {
            stmt.run(key, value);
        }
    }
};
