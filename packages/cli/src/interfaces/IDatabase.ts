/**
 * Database interface abstraction for dependency injection
 */
export interface IDatabase {
    /**
     * Prepare a SQL statement
     */
    prepare<T = any>(sql: string): IStatement<T>;

    /**
     * Execute a function within a transaction
     */
    transaction<T>(fn: () => T): T;

    /**
     * Execute raw SQL (for migrations)
     */
    exec(sql: string): void;

    /**
     * Close the database connection
     */
    close(): void;

    /**
     * Check if database is open
     */
    readonly open: boolean;
}

/**
 * Prepared statement interface
 */
export interface IStatement<T = any> {
    /**
     * Get a single row
     */
    get(...params: any[]): T | undefined;

    /**
     * Get all rows
     */
    all(...params: any[]): T[];

    /**
     * Run the statement (for INSERT, UPDATE, DELETE)
     */
    run(...params: any[]): IRunResult;
}

/**
 * Result of a run operation
 */
export interface IRunResult {
    changes: number;
    lastInsertRowid: number | bigint;
}
