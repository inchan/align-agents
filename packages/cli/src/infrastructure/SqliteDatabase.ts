import Database from 'better-sqlite3';
import { IDatabase, IStatement, IRunResult } from '../interfaces/IDatabase.js';
import path from 'path';
import fs from 'fs';

/**
 * SQLite database wrapper implementing IDatabase interface
 */
export class SqliteDatabase implements IDatabase {
    private db: Database.Database;

    constructor(dbPath: string) {
        // Ensure directory exists
        const dir = path.dirname(dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        this.db = new Database(dbPath);

        // Enable foreign keys
        this.db.pragma('foreign_keys = ON');

        // Set WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');
    }

    prepare<T = any>(sql: string): IStatement<T> {
        const stmt = this.db.prepare(sql);
        return {
            get: (...params: any[]) => stmt.get(...params) as T | undefined,
            all: (...params: any[]) => stmt.all(...params) as T[],
            run: (...params: any[]): IRunResult => {
                const result = stmt.run(...params);
                return {
                    changes: result.changes,
                    lastInsertRowid: result.lastInsertRowid
                };
            }
        };
    }

    transaction<T>(fn: () => T): T {
        const txn = this.db.transaction(fn);
        return txn();
    }

    exec(sql: string): void {
        this.db.exec(sql);
    }

    close(): void {
        this.db.close();
    }

    get open(): boolean {
        return this.db.open;
    }

    /**
     * Get the underlying better-sqlite3 database instance
     * (for advanced use cases)
     */
    getUnderlyingDb(): Database.Database {
        return this.db;
    }
}

/**
 * Create an in-memory database (for testing)
 */
export function createInMemoryDatabase(): IDatabase {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');

    return {
        prepare: <T = any>(sql: string): IStatement<T> => {
            const stmt = db.prepare(sql);
            return {
                get: (...params: any[]) => stmt.get(...params) as T | undefined,
                all: (...params: any[]) => stmt.all(...params) as T[],
                run: (...params: any[]): IRunResult => {
                    const result = stmt.run(...params);
                    return {
                        changes: result.changes,
                        lastInsertRowid: result.lastInsertRowid
                    };
                }
            };
        },
        transaction: <T>(fn: () => T): T => {
            const txn = db.transaction(fn);
            return txn();
        },
        exec: (sql: string): void => {
            db.exec(sql);
        },
        close: (): void => {
            db.close();
        },
        get open(): boolean {
            return db.open;
        }
    };
}
