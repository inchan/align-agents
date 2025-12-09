import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Mock os.homedir before importing mcp-multi
const { mockHomeDir } = vi.hoisted(() => ({
    mockHomeDir: '/mock/home',
}));

vi.mock('os', () => ({
    default: {
        homedir: () => mockHomeDir,
    },
    homedir: () => mockHomeDir,
}));

vi.mock('fs');

import fs from 'fs';
import {
    fetchMcpPool,
    createMcpDef,
    updateMcpDef,
    deleteMcpDef,
    fetchMcpSets,
    createMcpSet,
    updateMcpSet,
    deleteMcpSet,
    setActiveMcpSet,
} from '../mcp-multi.js';

describe('mcp-multi', () => {
    const mockMcpDir = path.join(mockHomeDir, '.ai-cli-syncer', 'mcp');
    const mockIndexPath = path.join(mockMcpDir, 'index.json');
    const mockMasterPath = path.join(mockHomeDir, '.ai-cli-syncer', 'master-mcp.json');

    // In-memory FS
    let mockFiles: Record<string, string> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        mockFiles = {};

        // Setup FS mocks
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            return p in mockFiles || p === mockMcpDir || p === path.dirname(mockMasterPath);
        });

        vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
            if (p in mockFiles) return mockFiles[p];
            throw new Error(`File not found: ${p}`);
        });

        vi.mocked(fs.writeFileSync).mockImplementation((p: any, data: any) => {
            mockFiles[p] = data.toString();
        });

        vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('fetchMcpPool', () => {
        it('should return empty pool when no index exists', () => {
            const pool = fetchMcpPool();
            expect(pool).toEqual([]);
        });

        it('should return pool from existing index', () => {
            const mockIndex = {
                pool: [
                    { id: '1', name: 'Server 1', command: 'npx', args: ['-y', 'server1'] },
                ],
                sets: [],
                activeSetId: null,
            };
            mockFiles[mockIndexPath] = JSON.stringify(mockIndex);

            const pool = fetchMcpPool();
            expect(pool).toHaveLength(1);
            expect(pool[0].name).toBe('Server 1');
        });
    });

    describe('createMcpDef', () => {
        it('should create a new MCP definition', () => {
            const newDef = createMcpDef({
                name: 'New Server',
                command: 'node',
                args: ['server.js'],
            });

            expect(newDef).toHaveProperty('id');
            expect(newDef.name).toBe('New Server');

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.pool).toHaveLength(1);
            expect(index.pool[0].name).toBe('New Server');
        });
    });

    describe('updateMcpDef', () => {
        it('should update existing definition', () => {
            // Setup initial state
            const initialIndex = {
                pool: [{ id: '1', name: 'Original', command: 'node', args: [] }],
                sets: [],
                activeSetId: null
            };
            mockFiles[mockIndexPath] = JSON.stringify(initialIndex);

            const updated = updateMcpDef('1', {
                name: 'Updated',
                command: 'npx',
            });

            expect(updated.name).toBe('Updated');

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.pool[0].name).toBe('Updated');
        });

        it('should throw error when definition not found', () => {
            mockFiles[mockIndexPath] = JSON.stringify({ pool: [], sets: [] });
            expect(() => updateMcpDef('nonexistent', { name: 'Test' })).toThrow('McpDef not found');
        });
    });

    describe('deleteMcpDef', () => {
        it('should delete definition from pool', () => {
            const initialIndex = {
                pool: [{ id: '1', name: 'To Delete', command: 'node', args: [] }],
                sets: [],
                activeSetId: null
            };
            mockFiles[mockIndexPath] = JSON.stringify(initialIndex);

            deleteMcpDef('1');

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.pool).toHaveLength(0);
        });

        it('should remove references from sets', () => {
            const initialIndex = {
                pool: [{ id: '1', name: 'Server', command: 'node', args: [] }],
                sets: [{ id: 's1', name: 'Set', items: [{ serverId: '1' }], isActive: false }],
                activeSetId: null
            };
            mockFiles[mockIndexPath] = JSON.stringify(initialIndex);

            deleteMcpDef('1');

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.sets[0].items).toHaveLength(0);
        });
    });

    describe('Set Operations', () => {
        it('should create and activate first set', () => {
            // Setup empty index to avoid migration creating a default set
            mockFiles[mockIndexPath] = JSON.stringify({ pool: [], sets: [], activeSetId: null });

            const set = createMcpSet('First Set');

            expect(set.isActive).toBe(true);

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.activeSetId).toBe(set.id);
            expect(mockFiles[mockMasterPath]).toBeDefined(); // Should update master-mcp
        });

        it('should update set', () => {
            const initialIndex = {
                pool: [],
                sets: [{ id: 's1', name: 'Original', items: [], isActive: true }],
                activeSetId: 's1'
            };
            mockFiles[mockIndexPath] = JSON.stringify(initialIndex);

            const updated = updateMcpSet('s1', { name: 'Updated' });
            expect(updated.name).toBe('Updated');
        });

        it('should delete set and activate next', () => {
            const initialIndex = {
                pool: [],
                sets: [
                    { id: 's1', name: 'First', items: [], isActive: true },
                    { id: 's2', name: 'Second', items: [], isActive: false }
                ],
                activeSetId: 's1'
            };
            mockFiles[mockIndexPath] = JSON.stringify(initialIndex);

            deleteMcpSet('s1');

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.sets).toHaveLength(1);
            expect(index.sets[0].id).toBe('s2');
            expect(index.sets[0].isActive).toBe(true);
            expect(index.activeSetId).toBe('s2');
        });

        it('should set active set', () => {
            const initialIndex = {
                pool: [],
                sets: [
                    { id: 's1', name: 'First', items: [], isActive: true },
                    { id: 's2', name: 'Second', items: [], isActive: false }
                ],
                activeSetId: 's1'
            };
            mockFiles[mockIndexPath] = JSON.stringify(initialIndex);

            setActiveMcpSet('s2');

            const index = JSON.parse(mockFiles[mockIndexPath]);
            expect(index.activeSetId).toBe('s2');
            expect(index.sets.find((s: any) => s.id === 's1').isActive).toBe(false);
            expect(index.sets.find((s: any) => s.id === 's2').isActive).toBe(true);
        });
    });
});
