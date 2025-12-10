import { SqliteDatabase } from './SqliteDatabase.js';
import { IDatabase } from '../interfaces/IDatabase.js';
import { ensureInitialized } from './database-init.js';
import path from 'path';
import os from 'os';

let dbInstance: IDatabase | null = null;

/**
 * Get the default database path
 */
export function getDefaultDatabasePath(): string {
    const homeDir = os.homedir();
    return path.join(homeDir, '.align-agents', 'data.db');
}

/**
 * Get or create the database instance (singleton)
 */
export function getDatabase(dbPath?: string): IDatabase {
    if (!dbInstance) {
        const actualPath = dbPath ?? getDefaultDatabasePath();
        dbInstance = new SqliteDatabase(actualPath);
        ensureInitialized(dbInstance);
    }
    return dbInstance;
}

/**
 * Close the database connection
 */
export function closeDatabase(): void {
    if (dbInstance) {
        dbInstance.close();
        dbInstance = null;
    }
}

/**
 * Reset the database instance (for testing)
 */
export function resetDatabase(): void {
    closeDatabase();
}
