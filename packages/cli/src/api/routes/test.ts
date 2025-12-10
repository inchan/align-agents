import { FastifyInstance } from 'fastify';
import { getDatabase } from '../../infrastructure/database.js';
import { getProjectsConfigPath } from '../../constants/paths.js';
import fs from 'fs';

export async function testRoutes(server: FastifyInstance) {
    server.post('/api/__test__/reset', async (request, reply) => {
        const db = getDatabase();

        try {
            db.transaction(() => {
                // Delete data in reverse dependency order
                db.exec('DELETE FROM mcp_set_items');
                db.exec('DELETE FROM mcp_sets');
                db.exec('DELETE FROM mcp_definitions');
                db.exec('DELETE FROM rules');
                // sync_config uses Replace, so deleting it is fine
                db.exec('DELETE FROM sync_config');
                // global_config might need preservation of specific keys if necessary, 
                // but for a full reset usually we want clean state. 
                // However, masterDir might be critical for the system to work. 
                // Let's truncate all for now as E2E tests should re-seed what they need.
                db.exec('DELETE FROM global_config');
            });

            // Reset Projects JSON
            try {
                const projectsPath = getProjectsConfigPath();
                if (fs.existsSync(projectsPath)) {
                    fs.writeFileSync(projectsPath, JSON.stringify([], null, 2));
                }
            } catch (err) {
                request.log.warn({ err }, 'Failed to reset projects.json');
            }

            return { status: 'ok', message: 'Database reset successfully' };
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to reset database' });
        }
    });

    server.post('/api/__test__/seed/mcp', async (request, reply) => {
        const db = getDatabase();
        const { sets = [], tools = [] } = request.body as any;

        try {
            db.transaction(() => {
                // Seed Tools/Definitions
                const insertDef = db.prepare(`
                    INSERT OR REPLACE INTO mcp_definitions (id, name, command, args, env, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
                `);

                for (const tool of tools) {
                    insertDef.run(
                        tool.id,
                        tool.name,
                        tool.command,
                        JSON.stringify(tool.args || []),
                        JSON.stringify(tool.env || {})
                    );
                }

                // Seed Sets
                const insertSet = db.prepare(`
                    INSERT OR REPLACE INTO mcp_sets (id, name, is_active, is_archived, created_at, updated_at)
                    VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
                `);

                const insertItem = db.prepare(`
                    INSERT INTO mcp_set_items (id, set_id, server_id, disabled, order_index, created_at)
                    VALUES (?, ?, ?, ?, ?, datetime('now'))
                `);

                for (const set of sets) {
                    insertSet.run(set.id, set.name, set.isActive ? 1 : 0, 0);

                    if (set.items) {
                        for (const item of set.items) {
                            insertItem.run(item.id, set.id, item.serverId, 0, 0);
                        }
                    }
                }
            });
            return { status: 'ok' };
        } catch (error) {
            request.log.error(error);
            return reply.code(500).send({ error: 'Failed to seed MCP data' });
        }
    });
}
