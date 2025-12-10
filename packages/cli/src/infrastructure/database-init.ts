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
    } catch (error) {
        console.error('[DB] Migration failed:', error);
    }
}
