import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'path';
import { McpRepository } from '../McpRepository.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';
import { McpSet, McpSetItem } from '../../../interfaces/IMcpService.js';

// Mock FileSystem
class MockFileSystem implements IFileSystem {
    private files: Map<string, string> = new Map();
    private dirs: Set<string> = new Set();

    exists(path: string): boolean {
        return this.files.has(path) || this.dirs.has(path);
    }

    mkdir(path: string): void {
        this.dirs.add(path);
    }

    readFile(path: string): string {
        if (!this.files.has(path)) {
            throw new Error(`File not found: ${path}`);
        }
        return this.files.get(path) || '';
    }

    writeFile(path: string, content: string): void {
        this.files.set(path, content);
    }

    join(...paths: string[]): string {
        return path.join(...paths);
    }

    dirname(p: string): string {
        return path.dirname(p);
    }

    basename(p: string): string {
        return path.basename(p);
    }

    relative(from: string, to: string): string {
        return path.relative(from, to);
    }

    // Unused methods for this test
    readdir(path: string): string[] { return []; }
    stat(path: string): { mtime: Date; isDirectory: () => boolean } {
        return { mtime: new Date(), isDirectory: () => false };
    }
    unlink(path: string): void { }
    rmdir(path: string): void { }
}

describe('McpRepository', () => {
    let fs: MockFileSystem;
    let repository: McpRepository;
    const masterDir = '/test/master';

    beforeEach(() => {
        fs = new MockFileSystem();
        repository = new McpRepository(fs, masterDir);
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
    });
});
