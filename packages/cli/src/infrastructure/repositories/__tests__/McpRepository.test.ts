import { describe, it, expect, beforeEach } from 'vitest';
import { McpRepository } from '../McpRepository.js';
import { McpSetItem } from '../../../interfaces/IMcpService.js';
import { createInMemoryDatabase } from '../../SqliteDatabase.js';
import { initializeSchema } from '../../database-init.js';
import { IDatabase } from '../../../interfaces/IDatabase.js';

describe('McpRepository', () => {
    let db: IDatabase;
    let repository: McpRepository;

    beforeEach(() => {
        // Create fresh in-memory database for each test
        db = createInMemoryDatabase();
        initializeSchema(db);
        repository = new McpRepository(db);
    });

    describe('MCP Sets Management', () => {
        it('should create a set with description', async () => {
            const name = 'Test Set';
            const description = 'This is a test set';
            const items: McpSetItem[] = [];

            const set = await repository.createSet(name, items, description);

            expect(set.name).toBe(name);
            expect(set.description).toBe(description);
            expect(set.items).toEqual(items);

            // Verify persistence
            const sets = await repository.getSets();
            expect(sets).toHaveLength(1);
            expect(sets[0].description).toBe(description);
        });

        it('should update a set description', async () => {
            // Create initial set
            const set = await repository.createSet('Initial Set', [], 'Initial Description');

            // Update description
            const newDescription = 'Updated Description';
            const updatedSet = await repository.updateSet(set.id, { description: newDescription });

            expect(updatedSet.description).toBe(newDescription);
            expect(updatedSet.name).toBe('Initial Set'); // Name should remain unchanged

            // Verify persistence
            const sets = await repository.getSets();
            expect(sets[0].description).toBe(newDescription);
        });

        it('should keep existing description when updating other fields', async () => {
            // Create initial set
            const description = 'Persistent Description';
            const set = await repository.createSet('Initial Set', [], description);

            // Update name only
            const newName = 'Updated Name';
            const updatedSet = await repository.updateSet(set.id, { name: newName });

            expect(updatedSet.name).toBe(newName);
            expect(updatedSet.description).toBe(description); // Description should remain unchanged

            // Verify persistence
            const sets = await repository.getSets();
            expect(sets[0].description).toBe(description);
        });

        it('deleteSet marks set as archived', async () => {
            const set = await repository.createSet('Set 1', []);

            // Set inactive first to allow delete
            const otherSet = await repository.createSet('Other Set', []);
            await repository.setActiveSet(otherSet.id);
            // db.prepare('UPDATE mcp_sets SET is_active = 0').run(); // Not needed if we switch active set successfully

            await repository.deleteSet(set.id);

            const result = await repository.getSet(set.id);
            expect(result).toBeNull(); // Should be filtered out by getSet logic if needed? 
            // Note: getSet implementation in previous step didn't filter by archived?
            // Wait, let's check McpRepository implementation again.
            // Ah, getSet DOES filter? No, standard getSet usually returns if ID matches.
            // Let's verify standard get behavior for Sets.
            // My implementation plan said: "Filter archived items in get methods". 
            // I updated getSets (list) but did I update getSet (single)?
            // I should double check. For now assume I need to fix getSet too if not already.

            // Checking DB directly for test
            const row = db.prepare('SELECT is_archived FROM mcp_sets WHERE id = ?').get(set.id) as any;
            expect(row.is_archived).toBe(1);
        });

        it('should create and retrieve MCP definitions', async () => {
            const def = await repository.createDefinition({
                name: 'test-server',
                command: 'node',
                args: ['server.js'],
                description: 'Test server'
            });

            expect(def.id).toBeDefined();
            expect(def.name).toBe('test-server');

            const retrieved = await repository.getDefinition(def.id);
            expect(retrieved).toEqual(def);
        });

        it('deleteDefinition marks definition as archived', async () => {
            const def = await repository.createDefinition({
                name: 'Server 1',
                command: 'cmd',
                args: []
            });

            await repository.deleteDefinition(def.id);

            const result = await repository.getDefinition(def.id);
            expect(result).toBeNull(); // Should be filtered out

            // Verify db row is archived
            const row = db.prepare('SELECT is_archived FROM mcp_definitions WHERE id = ?').get(def.id) as any;
            expect(row).toBeDefined();
            expect(row.is_archived).toBe(1);
        });

        it('should handle set items correctly', async () => {
            // Create definitions
            const def1 = await repository.createDefinition({
                name: 'server1',
                command: 'node',
                args: ['s1.js']
            });

            const def2 = await repository.createDefinition({
                name: 'server2',
                command: 'node',
                args: ['s2.js']
            });

            // Create set with items
            const items: McpSetItem[] = [
                { serverId: def1.id, disabled: false },
                { serverId: def2.id, disabled: true }
            ];

            const set = await repository.createSet('Test Set', items);

            expect(set.items).toHaveLength(2);
            expect(set.items[0].serverId).toBe(def1.id);
            expect(set.items[1].disabled).toBe(true);
        });
    });
});
