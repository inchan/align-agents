import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { RulesConfigRepository } from '../RulesConfigRepository.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';

type MockedFileSystem = {
    [K in keyof IFileSystem]: Mock;
};

// Mock dependencies
vi.mock('../../../constants/tools.js', () => ({
    getToolMetadata: vi.fn((id: string) => {
        const tools: Record<string, any> = {
            'claude': { name: 'Claude', rulesFilename: 'CLAUDE.md' },
            'cursor': { name: 'Cursor', rulesFilename: '.cursorrules' },
        };
        return tools[id] || null;
    }),
    getRulesCapableTools: vi.fn(() => [
        { id: 'claude', name: 'Claude', rulesFilename: 'CLAUDE.md' },
        { id: 'cursor', name: 'Cursor', rulesFilename: '.cursorrules' },
    ]),
}));

vi.mock('crypto', () => ({
    randomUUID: vi.fn(() => 'mock-uuid-1234'),
}));

describe('RulesConfigRepository', () => {
    let repository: RulesConfigRepository;
    let mockFs: MockedFileSystem;

    beforeEach(() => {
        vi.clearAllMocks();

        mockFs = {
            join: vi.fn((...parts) => parts.join('/')),
            exists: vi.fn().mockReturnValue(true),
            mkdir: vi.fn(),
            readFile: vi.fn().mockReturnValue('{}'),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            relative: vi.fn((from, to) => to),
            dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
            basename: vi.fn((p) => p.split('/').pop() || ''),
        };

        repository = new RulesConfigRepository(mockFs as IFileSystem, '/mock/master');
    });

    describe('load', () => {
        it('should load existing config file', () => {
            const mockConfig = { claude: { enabled: true, targetPath: '', global: true } };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = repository.load();

            expect(result).toEqual(mockConfig);
        });

        it('should return empty object if file does not exist', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = repository.load();

            expect(result).toEqual({});
        });

        it('should return empty object on parse error', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('invalid json');

            const result = repository.load();

            expect(result).toEqual({});
        });
    });

    describe('save', () => {
        it('should save valid config', () => {
            const config = { claude: { enabled: true, targetPath: '/path', global: true } };

            repository.save(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                '/mock/master/rules-config.json',
                expect.stringContaining('"claude"')
            );
        });

        it('should create directory if not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            repository.save({ claude: { enabled: true, targetPath: '', global: true } });

            expect(mockFs.mkdir).toHaveBeenCalledWith('/mock/master');
        });

        it('should throw error for unknown tool', () => {
            const config = { unknown_tool: { enabled: true, targetPath: '', global: true } };

            expect(() => repository.save(config)).toThrow('Unknown tool');
        });
    });

    describe('init', () => {
        it('should not reinitialize if config exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);

            repository.init();

            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });

        it('should create default config for all rules-capable tools', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            repository.init();

            expect(mockFs.writeFile).toHaveBeenCalled();
            const writeCall = mockFs.writeFile.mock.calls[0];
            const writtenConfig = JSON.parse(writeCall[1]);

            expect(writtenConfig).toHaveProperty('claude');
            expect(writtenConfig).toHaveProperty('cursor');
            expect(writtenConfig.claude.enabled).toBe(true);
            expect(writtenConfig.claude.global).toBe(true);
        });
    });

    describe('getRulesList', () => {
        it('should load existing rules list', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Rule 1', content: 'content', isActive: true, createdAt: '', updatedAt: '' }
                ]
            };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.getRulesList();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Rule 1');
        });

        it('should return empty array if list file does not exist and no master rules', async () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            const result = await repository.getRulesList();

            expect(result).toEqual([]);
        });

        it('should migrate from master-rules.md if list does not exist', async () => {
            mockFs.exists = vi.fn()
                .mockReturnValueOnce(false)   // index.json does not exist
                .mockReturnValueOnce(true);   // master-rules.md exists

            mockFs.readFile = vi.fn().mockReturnValue('# Master Rules Content');

            const result = await repository.getRulesList();

            expect(result).toHaveLength(1);
            expect(result[0].name).toBe('Default Rules');
            expect(result[0].content).toBe('# Master Rules Content');
            expect(result[0].isActive).toBe(true);
        });

        it('should handle parse error gracefully', async () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('invalid json');

            const result = await repository.getRulesList();

            expect(result).toEqual([]);
        });
    });

    describe('getRule', () => {
        it('should return rule by id', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Rule 1', content: 'content 1', isActive: true, createdAt: '', updatedAt: '' },
                    { id: '2', name: 'Rule 2', content: 'content 2', isActive: false, createdAt: '', updatedAt: '' },
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.getRule('2');

            expect(result?.name).toBe('Rule 2');
        });

        it('should return null if rule not found', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.getRule('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('createRule', () => {
        it('should create new rule', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.createRule('New Rule', 'new content');

            expect(result.id).toBe('mock-uuid-1234');
            expect(result.name).toBe('New Rule');
            expect(result.content).toBe('new content');
            expect(mockFs.writeFile).toHaveBeenCalled();
        });

        it('should set first rule as active', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.createRule('First Rule', 'content');

            expect(result.isActive).toBe(true);
        });

        it('should not set subsequent rules as active', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Existing', content: '', isActive: true, createdAt: '', updatedAt: '' }
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.createRule('Second Rule', 'content');

            expect(result.isActive).toBe(false);
        });

        it('should update master rules file if new rule is active', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await repository.createRule('First Rule', 'active content');

            // Check that master-rules.md was updated
            const masterWriteCall = mockFs.writeFile.mock.calls.find(
                (call) => (call as [string, string])[0].includes('master-rules.md')
            ) as [string, string] | undefined;
            expect(masterWriteCall).toBeDefined();
            expect(masterWriteCall![1]).toBe('active content');
        });
    });

    describe('updateRule', () => {
        it('should update existing rule', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Rule 1', content: 'old content', isActive: false, createdAt: '', updatedAt: '' }
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            const result = await repository.updateRule('1', 'new content', 'Updated Name');

            expect(result.content).toBe('new content');
            expect(result.name).toBe('Updated Name');
        });

        it('should throw error if rule not found', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await expect(repository.updateRule('nonexistent', 'content'))
                .rejects.toThrow('Rule not found');
        });

        it('should update master rules file if rule is active', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Active Rule', content: 'old', isActive: true, createdAt: '', updatedAt: '' }
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await repository.updateRule('1', 'updated active content');

            const masterWriteCall = mockFs.writeFile.mock.calls.find(
                (call) => (call as [string, string])[0].includes('master-rules.md')
            );
            expect(masterWriteCall).toBeDefined();
        });
    });

    describe('deleteRule', () => {
        it('should delete non-active rule', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Active', content: '', isActive: true, createdAt: '', updatedAt: '' },
                    { id: '2', name: 'Inactive', content: '', isActive: false, createdAt: '', updatedAt: '' },
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await repository.deleteRule('2');

            expect(mockFs.writeFile).toHaveBeenCalled();
            const writeCall = mockFs.writeFile.mock.calls[0] as [string, string];
            const writtenRules = JSON.parse(writeCall[1]);
            expect(writtenRules.rules).toHaveLength(1);
        });

        it('should throw error when deleting active rule', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Active', content: '', isActive: true, createdAt: '', updatedAt: '' },
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await expect(repository.deleteRule('1'))
                .rejects.toThrow('Cannot delete active rule');
        });

        it('should throw error if rule not found', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await expect(repository.deleteRule('nonexistent'))
                .rejects.toThrow('Rule not found');
        });
    });

    describe('setActiveRule', () => {
        it('should activate specified rule and deactivate others', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Rule 1', content: 'content 1', isActive: true, createdAt: '', updatedAt: '' },
                    { id: '2', name: 'Rule 2', content: 'content 2', isActive: false, createdAt: '', updatedAt: '' },
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await repository.setActiveRule('2');

            const writeCall = mockFs.writeFile.mock.calls.find(
                (call) => (call as [string, string])[0].includes('index.json')
            ) as [string, string] | undefined;
            expect(writeCall).toBeDefined();
            const writtenRules = JSON.parse(writeCall![1]);

            expect(writtenRules.rules[0].isActive).toBe(false);
            expect(writtenRules.rules[1].isActive).toBe(true);
        });

        it('should update master rules file with new active rule content', async () => {
            const mockRules = {
                rules: [
                    { id: '1', name: 'Rule 1', content: 'content 1', isActive: true, createdAt: '', updatedAt: '' },
                    { id: '2', name: 'Rule 2', content: 'content 2', isActive: false, createdAt: '', updatedAt: '' },
                ]
            };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await repository.setActiveRule('2');

            const masterWriteCall = mockFs.writeFile.mock.calls.find(
                (call) => (call as [string, string])[0].includes('master-rules.md')
            ) as [string, string] | undefined;
            expect(masterWriteCall).toBeDefined();
            expect(masterWriteCall![1]).toBe('content 2');
        });

        it('should throw error if rule not found', async () => {
            const mockRules = { rules: [] };
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockRules));

            await expect(repository.setActiveRule('nonexistent'))
                .rejects.toThrow('Rule not found');
        });
    });
});
