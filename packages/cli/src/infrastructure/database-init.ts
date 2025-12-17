import { IDatabase } from '../interfaces/IDatabase.js';
import { INITIAL_SCHEMA, INITIAL_VERSION_INSERT } from './schema.js';

/**
 * Initialize database schema
 */
export function initializeSchema(db: IDatabase): void {
    db.exec(INITIAL_SCHEMA);
    db.exec(INITIAL_VERSION_INSERT);
}

/**
 * Get current schema version
 */
export function getSchemaVersion(db: IDatabase): number {
    const result = db.prepare<{ version: number }>(`
        SELECT version FROM schema_version ORDER BY version DESC LIMIT 1
    `).get();

    return result?.version ?? 0;
}

/**
 * Check if database is initialized
 */
export function isDatabaseInitialized(db: IDatabase): boolean {
    try {
        const result = db.prepare(`
            SELECT name FROM sqlite_master WHERE type='table' AND name='schema_version'
        `).get();
        return !!result;
    } catch {
        return false;
    }
}

/**
 * Ensure database is initialized
 */
export function ensureInitialized(db: IDatabase): void {
    if (!isDatabaseInitialized(db)) {
        console.log('[DB] Initializing database schema...');
        initializeSchema(db);
        console.log('[DB] Database schema initialized successfully');
    } else {
        // Migration: Ensure new is_archived columns exist
        checkAndMigrateColumns(db);
    }
}

/**
 * Check and add missing columns for soft delete support
 */
function checkAndMigrateColumns(db: IDatabase): void {
    try {
        // Check mcp_definitions
        const defCols = db.prepare<{ name: string }>("PRAGMA table_info(mcp_definitions)").all();
        const hasDefArchived = defCols.some(c => c.name === 'is_archived');
        if (!hasDefArchived) {
            console.log('[DB] Migrating mcp_definitions: adding is_archived column...');
            db.exec('ALTER TABLE mcp_definitions ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0');
            db.exec('CREATE INDEX IF NOT EXISTS idx_mcp_definitions_is_archived ON mcp_definitions(is_archived)');
        }

        // Check rules
        const rulesCols = db.prepare<{ name: string }>("PRAGMA table_info(rules)").all();
        const hasRulesArchived = rulesCols.some(c => c.name === 'is_archived');
        if (!hasRulesArchived) {
            console.log('[DB] Migrating rules: adding is_archived column...');
            db.exec('ALTER TABLE rules ADD COLUMN is_archived INTEGER NOT NULL DEFAULT 0');
            db.exec('CREATE INDEX IF NOT EXISTS idx_rules_is_archived ON rules(is_archived)');
        }

        // Check mcp_sets for order_index
        const mcpSetsCols = db.prepare<{ name: string }>("PRAGMA table_info(mcp_sets)").all();
        const hasMcpSetsOrder = mcpSetsCols.some(c => c.name === 'order_index');
        if (!hasMcpSetsOrder) {
            console.log('[DB] Migrating mcp_sets: adding order_index column...');
            db.exec('ALTER TABLE mcp_sets ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0');
        }

        // Check rules for order_index
        const hasRulesOrder = rulesCols.some(c => c.name === 'order_index');
        if (!hasRulesOrder) {
            console.log('[DB] Migrating rules: adding order_index column...');
            db.exec('ALTER TABLE rules ADD COLUMN order_index INTEGER NOT NULL DEFAULT 0');
        }

        // Note: is_active column is deprecated and ignored by the application.
        // The column will be removed by the user manually if needed.
        // No automatic migration to drop the column.

        // Check mcp_definitions for HTTP/SSE support (type, url columns)
        // Also need to make command/args nullable for HTTP/SSE type
        const hasType = defCols.some(c => c.name === 'type');
        const hasUrl = defCols.some(c => c.name === 'url');

        // Check if command column has NOT NULL constraint (notnull = 1 means NOT NULL)
        const commandCol = defCols.find(c => c.name === 'command') as { name: string; notnull: number } | undefined;
        const needsTableRecreate = commandCol && (commandCol as any).notnull === 1;

        if (!hasType || !hasUrl || needsTableRecreate) {
            console.log('[DB] Migrating mcp_definitions for HTTP/SSE support...');
            migrateMcpDefinitionsForHttpSse(db);
        }
    } catch (error) {
        console.error('[DB] Migration failed:', error);
    }
}

/**
 * Migrate mcp_definitions table to support HTTP/SSE type
 * SQLite doesn't support ALTER COLUMN, so we need to recreate the table
 */
function migrateMcpDefinitionsForHttpSse(db: IDatabase): void {
    // Disable foreign keys during migration to avoid constraint violations
    db.exec('PRAGMA foreign_keys = OFF');

    try {
        db.exec(`
            -- Clean up any leftover temp table from previous failed migration
            DROP TABLE IF EXISTS mcp_definitions_new;

            -- Create new table with updated schema (command/args now nullable for HTTP/SSE)
            CREATE TABLE mcp_definitions_new (
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

            -- Copy existing data (preserve all existing stdio-type definitions)
            INSERT INTO mcp_definitions_new (id, name, command, args, cwd, type, url, description, env, is_archived, created_at, updated_at)
            SELECT id, name, command, args, cwd, type, url, description, env, is_archived, created_at, updated_at
            FROM mcp_definitions;

            -- Drop old table
            DROP TABLE mcp_definitions;

            -- Rename new table
            ALTER TABLE mcp_definitions_new RENAME TO mcp_definitions;

            -- Recreate indexes
            CREATE INDEX IF NOT EXISTS idx_mcp_definitions_name ON mcp_definitions(name);
            CREATE INDEX IF NOT EXISTS idx_mcp_definitions_created_at ON mcp_definitions(created_at);
            CREATE INDEX IF NOT EXISTS idx_mcp_definitions_is_archived ON mcp_definitions(is_archived);
        `);
        console.log('[DB] mcp_definitions table migrated for HTTP/SSE support');
    } finally {
        // Re-enable foreign keys
        db.exec('PRAGMA foreign_keys = ON');
    }
}
