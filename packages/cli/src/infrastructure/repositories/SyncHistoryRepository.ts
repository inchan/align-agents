import { Database } from 'better-sqlite3';

export interface SyncHistoryEntry {
    id: string;
    created_at: string;
    target_type: 'rule' | 'mcp_set' | 'all_rules' | 'all_mcp';
    target_id?: string;
    target_name?: string;
    tool_id?: string;
    tool_name?: string;
    tool_set_id?: string;
    status: 'success' | 'partial' | 'failed';
    success_count: number;
    failed_count: number;
    skipped_count: number;
    strategy?: string;
    error_message?: string;
    details?: string;
    duration_ms?: number;
    user_agent?: string;
    triggered_by?: 'manual' | 'auto' | 'watch';
}

export interface SyncHistoryCreateInput {
    id: string;
    target_type: 'rule' | 'mcp_set' | 'all_rules' | 'all_mcp';
    target_id?: string;
    target_name?: string;
    tool_id?: string;
    tool_name?: string;
    tool_set_id?: string;
    status: 'success' | 'partial' | 'failed';
    success_count: number;
    failed_count: number;
    skipped_count: number;
    strategy?: string;
    error_message?: string;
    details?: string;
    duration_ms?: number;
    user_agent?: string;
    triggered_by?: 'manual' | 'auto' | 'watch';
}

export interface SyncHistoryFindOptions {
    limit?: number;
    offset?: number;
    target_type?: string;
    tool_id?: string;
    status?: string;
}

export interface SyncHistoryCountOptions {
    target_type?: string;
    tool_id?: string;
    status?: string;
}

export class SyncHistoryRepository {
    constructor(private db: Database) {}

    /**
     * Create a new sync history entry
     */
    create(entry: SyncHistoryCreateInput): SyncHistoryEntry {
        const stmt = this.db.prepare(`
            INSERT INTO sync_history (
                id, target_type, target_id, target_name,
                tool_id, tool_name, tool_set_id, status,
                success_count, failed_count, skipped_count,
                strategy, error_message, details, duration_ms,
                user_agent, triggered_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        stmt.run(
            entry.id,
            entry.target_type,
            entry.target_id || null,
            entry.target_name || null,
            entry.tool_id || null,
            entry.tool_name || null,
            entry.tool_set_id || null,
            entry.status,
            entry.success_count,
            entry.failed_count,
            entry.skipped_count,
            entry.strategy || null,
            entry.error_message || null,
            entry.details || null,
            entry.duration_ms || null,
            entry.user_agent || null,
            entry.triggered_by || 'manual'
        );

        const created = this.findById(entry.id);
        if (!created) {
            throw new Error(`Failed to create sync history entry: ${entry.id}`);
        }
        return created;
    }

    /**
     * Find sync history entry by ID
     */
    findById(id: string): SyncHistoryEntry | undefined {
        const stmt = this.db.prepare('SELECT * FROM sync_history WHERE id = ?');
        const row = stmt.get(id);
        return row as SyncHistoryEntry | undefined;
    }

    /**
     * Find all sync history entries with optional filtering and pagination
     */
    findAll(options?: SyncHistoryFindOptions): SyncHistoryEntry[] {
        let query = 'SELECT * FROM sync_history WHERE 1=1';
        const params: any[] = [];

        if (options?.target_type) {
            query += ' AND target_type = ?';
            params.push(options.target_type);
        }
        if (options?.tool_id) {
            query += ' AND tool_id = ?';
            params.push(options.tool_id);
        }
        if (options?.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }

        query += ' ORDER BY created_at DESC';

        if (options?.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
            if (options?.offset) {
                query += ' OFFSET ?';
                params.push(options.offset);
            }
        }

        const stmt = this.db.prepare(query);
        return stmt.all(...params) as SyncHistoryEntry[];
    }

    /**
     * Count sync history entries with optional filtering
     */
    count(options?: SyncHistoryCountOptions): number {
        let query = 'SELECT COUNT(*) as count FROM sync_history WHERE 1=1';
        const params: any[] = [];

        if (options?.target_type) {
            query += ' AND target_type = ?';
            params.push(options.target_type);
        }
        if (options?.tool_id) {
            query += ' AND tool_id = ?';
            params.push(options.tool_id);
        }
        if (options?.status) {
            query += ' AND status = ?';
            params.push(options.status);
        }

        const stmt = this.db.prepare(query);
        const result = stmt.get(...params) as { count: number };
        return result.count;
    }

    /**
     * Get recent sync history entries (last N entries)
     */
    getRecent(limit: number = 10): SyncHistoryEntry[] {
        return this.findAll({ limit });
    }

    /**
     * Get sync history entries for a specific target
     */
    findByTarget(targetType: string, targetId?: string, limit: number = 50): SyncHistoryEntry[] {
        let query = 'SELECT * FROM sync_history WHERE target_type = ?';
        const params: any[] = [targetType];

        if (targetId) {
            query += ' AND target_id = ?';
            params.push(targetId);
        }

        query += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        const stmt = this.db.prepare(query);
        return stmt.all(...params) as SyncHistoryEntry[];
    }

    /**
     * Get sync history entries for a specific tool
     */
    findByTool(toolId: string, limit: number = 50): SyncHistoryEntry[] {
        const stmt = this.db.prepare(`
            SELECT * FROM sync_history
            WHERE tool_id = ?
            ORDER BY created_at DESC
            LIMIT ?
        `);
        return stmt.all(toolId, limit) as SyncHistoryEntry[];
    }

    /**
     * Delete old sync history entries (cleanup)
     * @param daysOld - Delete entries older than this many days
     */
    deleteOlderThan(daysOld: number): number {
        const stmt = this.db.prepare(`
            DELETE FROM sync_history
            WHERE datetime(created_at) < datetime('now', '-' || ? || ' days')
        `);
        const result = stmt.run(daysOld);
        return result.changes;
    }

    /**
     * Get statistics about sync history
     */
    getStats(): {
        total: number;
        by_status: { success: number; partial: number; failed: number };
        success_rate: number;
        avg_duration_ms: number;
    } {
        const total = this.count();
        const success = this.count({ status: 'success' });
        const partial = this.count({ status: 'partial' });
        const failed = this.count({ status: 'failed' });

        // Calculate average duration from recent entries
        const recent = this.findAll({ limit: 100 });
        const totalDuration = recent.reduce((sum, entry) => sum + (entry.duration_ms || 0), 0);
        const avg_duration_ms = recent.length > 0 ? Math.round(totalDuration / recent.length) : 0;

        return {
            total,
            by_status: { success, partial, failed },
            success_rate: total > 0 ? Math.round((success / total) * 100 * 100) / 100 : 0,
            avg_duration_ms
        };
    }
}
