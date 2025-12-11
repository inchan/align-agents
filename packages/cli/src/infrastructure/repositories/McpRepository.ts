import { IDatabase } from '../../interfaces/IDatabase.js';
import { McpDef, McpSet, McpSetItem } from '../../interfaces/IMcpService.js';
import { randomUUID } from 'crypto';

export class McpRepository {
    constructor(private db: IDatabase) { }

    // ========== MCP Definitions Management ==========

    async getDefinitions(): Promise<McpDef[]> {
        const rows = this.db.prepare<any>(`
            SELECT id, name, command, args, cwd, type, url, description, env, created_at, updated_at
            FROM mcp_definitions
            WHERE is_archived = 0
            ORDER BY created_at DESC
        `).all();

        return rows.map(row => this.rowToMcpDef(row));
    }

    async getDefinition(id: string): Promise<McpDef | null> {
        const row = this.db.prepare<any>(`
            SELECT id, name, command, args, cwd, type, url, description, env, created_at, updated_at
            FROM mcp_definitions
            WHERE id = ? AND is_archived = 0
        `).get(id);

        return row ? this.rowToMcpDef(row) : null;
    }

    async createDefinition(def: Omit<McpDef, 'id'>): Promise<McpDef> {
        const newDef: McpDef = {
            id: randomUUID(),
            ...def
        };

        const now = new Date().toISOString();

        this.db.prepare(`
            INSERT INTO mcp_definitions (id, name, command, args, cwd, type, url, description, env, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
            newDef.id,
            newDef.name,
            newDef.command ?? null,
            newDef.args ? JSON.stringify(newDef.args) : null,
            newDef.cwd ?? null,
            newDef.type ?? null,
            newDef.url ?? null,
            newDef.description ?? null,
            newDef.env ? JSON.stringify(newDef.env) : null,
            now,
            now
        );

        return newDef;
    }

    async updateDefinition(id: string, updates: Partial<Omit<McpDef, 'id'>>): Promise<McpDef> {
        const existing = await this.getDefinition(id);
        if (!existing) {
            throw new Error(`MCP Definition not found: ${id}`);
        }

        const updated: McpDef = { ...existing, ...updates };
        const now = new Date().toISOString();

        this.db.prepare(`
            UPDATE mcp_definitions
            SET name = ?, command = ?, args = ?, cwd = ?, type = ?, url = ?, description = ?, env = ?, updated_at = ?
            WHERE id = ?
        `).run(
            updated.name,
            updated.command ?? null,
            updated.args ? JSON.stringify(updated.args) : null,
            updated.cwd ?? null,
            updated.type ?? null,
            updated.url ?? null,
            updated.description ?? null,
            updated.env ? JSON.stringify(updated.env) : null,
            now,
            id
        );

        return updated;
    }

    async deleteDefinition(id: string): Promise<void> {
        return this.db.transaction(() => {
            // Check if definition exists
            // Check if definition exists and is active
            const def = this.db.prepare(`SELECT id FROM mcp_definitions WHERE id = ? AND is_archived = 0`).get(id);
            if (!def) {
                throw new Error(`MCP Definition not found: ${id}`);
            }

            // Soft delete: Mark as archived
            const now = new Date().toISOString();
            this.db.prepare(`
                UPDATE mcp_definitions 
                SET is_archived = 1, updated_at = ?
                WHERE id = ?
            `).run(now, id);

            // Note: We intentionally do NOT remove them from mcp_set_items.
            // Items pointing to archived definitions will remain but might need handling in getSetItems if we want to hide them.
            // For rigorous soft delete, we preserve the link.
        });
    }

    // ========== MCP Sets Management ==========

    async getSets(): Promise<McpSet[]> {
        const rows = this.db.prepare<any>(`
            SELECT id, name, description, is_active, is_archived, order_index, created_at, updated_at
            FROM mcp_sets
            WHERE is_archived = 0 OR is_archived IS NULL
            ORDER BY order_index ASC, created_at DESC
        `).all();

        const sets: McpSet[] = [];
        for (const row of rows) {
            const items = await this.getSetItems(row.id);
            sets.push({
                id: row.id,
                name: row.name,
                description: row.description,
                isActive: Boolean(row.is_active),
                isArchived: Boolean(row.is_archived),
                items,
                orderIndex: row.order_index,
                createdAt: row.created_at,
                updatedAt: row.updated_at
            });
        }

        return sets;
    }

    async getSet(id: string): Promise<McpSet | null> {
        const row = this.db.prepare<any>(`
            SELECT id, name, description, is_active, is_archived, order_index, created_at, updated_at
            FROM mcp_sets
            WHERE id = ? AND is_archived = 0
        `).get(id);

        if (!row) {
            return null;
        }

        const items = await this.getSetItems(id);

        return {
            id: row.id,
            name: row.name,
            description: row.description,
            isActive: Boolean(row.is_active),
            isArchived: Boolean(row.is_archived),
            items,
            orderIndex: row.order_index,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }

    async createSet(name: string, items: McpSetItem[], description?: string): Promise<McpSet> {
        return this.db.transaction(() => {
            // Check if this is the first set
            const count = this.db.prepare<{ count: number }>(`
                SELECT COUNT(*) as count FROM mcp_sets
            `).get();
            const isActive = (count?.count ?? 0) === 0;

            const maxOrder = this.db.prepare<{ maxIndex: number }>(`
                SELECT MAX(order_index) as maxIndex FROM mcp_sets
            `).get();
            const nextOrder = (maxOrder?.maxIndex ?? 0) + 1;

            const newSet: McpSet = {
                id: randomUUID(),
                name,
                description,
                items,
                isActive,
                isArchived: false,
                orderIndex: nextOrder,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Insert set
            this.db.prepare(`
                INSERT INTO mcp_sets (id, name, description, is_active, is_archived, order_index, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
                newSet.id,
                newSet.name,
                newSet.description ?? null,
                newSet.isActive ? 1 : 0,
                newSet.isArchived ? 1 : 0,
                newSet.orderIndex,
                newSet.createdAt,
                newSet.updatedAt
            );

            // Insert items
            this.insertSetItems(newSet.id, items);

            return newSet;
        });
    }

    async updateSet(id: string, updates: { name?: string; description?: string; items?: McpSetItem[]; isArchived?: boolean }): Promise<McpSet> {
        return this.db.transaction(() => {
            const existing = this.db.prepare<any>(`
                SELECT id FROM mcp_sets WHERE id = ?
            `).get(id);

            if (!existing) {
                throw new Error(`MCP Set not found: ${id}`);
            }

            const now = new Date().toISOString();

            // Build update query dynamically
            const updateFields: string[] = [];
            const updateValues: any[] = [];

            if (updates.name !== undefined) {
                updateFields.push('name = ?');
                updateValues.push(updates.name);
            }
            if (updates.description !== undefined) {
                updateFields.push('description = ?');
                updateValues.push(updates.description);
            }
            if (updates.isArchived !== undefined) {
                updateFields.push('is_archived = ?');
                updateValues.push(updates.isArchived ? 1 : 0);
            }

            updateFields.push('updated_at = ?');
            updateValues.push(now);
            updateValues.push(id);

            if (updateFields.length > 0) {
                this.db.prepare(`
                    UPDATE mcp_sets
                    SET ${updateFields.join(', ')}
                    WHERE id = ?
                `).run(...updateValues);
            }

            // Update items if provided
            if (updates.items) {
                // Delete existing items
                this.db.prepare(`DELETE FROM mcp_set_items WHERE set_id = ?`).run(id);
                // Insert new items
                this.insertSetItems(id, updates.items);
            }

            // Return updated set - this is inside transaction so getSet is synchronous
            const row = this.db.prepare<any>(`
                SELECT id, name, description, is_active, is_archived, order_index, created_at, updated_at
                FROM mcp_sets
                WHERE id = ?
            `).get(id);

            if (!row) {
                throw new Error(`Failed to retrieve updated set: ${id}`);
            }

            const items = this.getSetItemsSync(id);

            return {
                id: row.id,
                name: row.name,
                description: row.description,
                isActive: Boolean(row.is_active),
                isArchived: Boolean(row.is_archived),
                items,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                orderIndex: row.order_index
            };
        });
    }

    async reorderMcpSets(ids: string[]): Promise<void> {
        return this.db.transaction(() => {
            const stmt = this.db.prepare(`
                UPDATE mcp_sets
                SET order_index = ?, updated_at = datetime('now')
                WHERE id = ?
            `);

            ids.forEach((id, index) => {
                stmt.run(index, id);
            });
        });
    }

    async deleteSet(id: string): Promise<void> {
        return this.db.transaction(() => {
            const set = this.db.prepare<any>(`
                SELECT is_active FROM mcp_sets WHERE id = ?
            `).get(id);

            if (!set) {
                throw new Error(`MCP Set not found: ${id}`);
            }

            if (set.is_active) {
                throw new Error('Cannot delete active MCP set');
            }

            // Soft Delete: Archive and deactivate
            const now = new Date().toISOString();
            this.db.prepare(`
                UPDATE mcp_sets 
                SET is_archived = 1, is_active = 0, updated_at = ?
                WHERE id = ?
            `).run(now, id);
        });
    }

    async setActiveSet(id: string): Promise<void> {
        return this.db.transaction(() => {
            const set = this.db.prepare<any>(`
                SELECT id FROM mcp_sets WHERE id = ?
            `).get(id);

            if (!set) {
                throw new Error(`MCP Set not found: ${id}`);
            }

            // Deactivate all sets
            this.db.prepare(`UPDATE mcp_sets SET is_active = 0`).run();

            // Activate target set
            this.db.prepare(`UPDATE mcp_sets SET is_active = 1 WHERE id = ?`).run(id);
        });
    }

    // ========== Helper Methods ==========

    private async getSetItems(setId: string): Promise<McpSetItem[]> {
        return this.getSetItemsSync(setId);
    }

    private getSetItemsSync(setId: string): McpSetItem[] {
        const rows = this.db.prepare<any>(`
            SELECT server_id, disabled, order_index
            FROM mcp_set_items
            WHERE set_id = ?
            ORDER BY order_index ASC
        `).all(setId);

        return rows.map(row => ({
            serverId: row.server_id,
            disabled: Boolean(row.disabled)
        }));
    }

    private insertSetItems(setId: string, items: McpSetItem[]): void {
        const stmt = this.db.prepare(`
            INSERT INTO mcp_set_items (id, set_id, server_id, disabled, order_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const now = new Date().toISOString();
        items.forEach((item, index) => {
            stmt.run(
                randomUUID(),
                setId,
                item.serverId,
                item.disabled ? 1 : 0,
                index,
                now
            );
        });
    }

    private rowToMcpDef(row: any): McpDef {
        return {
            id: row.id,
            name: row.name,
            // stdio type fields
            command: row.command || undefined,
            args: row.args ? JSON.parse(row.args) : undefined,
            cwd: row.cwd || undefined,
            // HTTP/SSE type fields
            type: row.type || undefined,
            url: row.url || undefined,
            // common fields
            description: row.description || undefined,
            env: row.env ? JSON.parse(row.env) : undefined
        };
    }
}
