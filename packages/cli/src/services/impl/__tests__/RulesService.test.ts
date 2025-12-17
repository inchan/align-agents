import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesService } from '../RulesService.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';
import { Rule } from '../../../interfaces/IRulesService.js';

// Mock dependencies
const { mockRepo, mockSyncLogger } = vi.hoisted(() => ({
    mockRepo: {
        getRulesList: vi.fn(),
        getRule: vi.fn(),
        createRule: vi.fn(),
        updateRule: vi.fn(),
        deleteRule: vi.fn(),
        load: vi.fn(),
        save: vi.fn(),
        init: vi.fn(),
    },
    mockSyncLogger: {
        logResult: vi.fn(),
        logBatchSyncStart: vi.fn(),
        logSummary: vi.fn(),
    },
}));

vi.mock('../../../infrastructure/repositories/RulesConfigRepository.js', () => ({
    RulesConfigRepository: class {
        constructor() {
            return mockRepo;
        }
    }
}));

vi.mock('../../../utils/logger.js', () => ({
    SyncLogger: mockSyncLogger,
}));

vi.mock('../../../services/history.js', () => ({
    saveVersion: vi.fn(),
}));

vi.mock('../../../utils/backup.js', () => ({
    createTimestampedBackup: vi.fn(),
}));

vi.mock('../../../constants/tools.js', () => ({
    getToolMetadata: vi.fn((id: string) => {
        const tools: Record<string, any> = {
            'claude': { name: 'Claude', rulesFilename: 'CLAUDE.md', globalRulesDir: '/home/user/.claude' },
            'cursor': { name: 'Cursor', rulesFilename: '.cursorrules', globalRulesDir: '/home/user/.cursor' },
            'windsurf': { name: 'Windsurf', rulesFilename: '.windsurfrules', globalRulesDir: null },
            'tool1': { name: 'Tool 1', rulesFilename: 'TOOL1.md', globalRulesDir: null },
            'tool2': { name: 'Tool 2', rulesFilename: 'TOOL2.md', globalRulesDir: null },
        };
        return tools[id] || null;
    }),
    getRulesCapableTools: vi.fn(() => [
        { id: 'claude', name: 'Claude', rulesFilename: 'CLAUDE.md', globalRulesDir: '/home/user/.claude' },
        { id: 'cursor', name: 'Cursor', rulesFilename: '.cursorrules', globalRulesDir: '/home/user/.cursor' },
        { id: 'tool1', name: 'Tool 1', rulesFilename: 'TOOL1.md', globalRulesDir: null },
        { id: 'tool2', name: 'Tool 2', rulesFilename: 'TOOL2.md', globalRulesDir: null },
    ]),
}));

describe('RulesService', () => {
    let service: RulesService;
    let mockFs: IFileSystem;

    beforeEach(() => {
        vi.clearAllMocks();

        mockFs = {
            join: vi.fn((...parts) => parts.join('/')),
            exists: vi.fn().mockReturnValue(true),
            mkdir: vi.fn(),
            readFile: vi.fn().mockReturnValue('# Default Rules'),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            relative: vi.fn((from, to) => to),
            dirname: vi.fn((p) => p.split('/').slice(0, -1).join('/')),
            basename: vi.fn((p) => p.split('/').pop() || ''),
        };

        service = new RulesService(mockFs, '/mock/master');
    });

    describe('Multi-rules management', () => {
        it('should delegate getRulesList to repository', async () => {
            const mockRules: Rule[] = [
                { id: '1', name: 'Rule 1', content: 'content', isActive: true, createdAt: '', updatedAt: '' }
            ];
            mockRepo.getRulesList.mockResolvedValue(mockRules);

            const result = await service.getRulesList();

            expect(mockRepo.getRulesList).toHaveBeenCalled();
            expect(result).toEqual(mockRules);
        });

        it('should delegate getRule to repository', async () => {
            const mockRule: Rule = { id: '1', name: 'Rule 1', content: 'content', isActive: true, createdAt: '', updatedAt: '' };
            mockRepo.getRule.mockResolvedValue(mockRule);

            const result = await service.getRule('1');

            expect(mockRepo.getRule).toHaveBeenCalledWith('1');
            expect(result).toEqual(mockRule);
        });

        it('should delegate createRule to repository', async () => {
            const newRule: Rule = { id: '2', name: 'New Rule', content: 'new content', isActive: true, createdAt: '', updatedAt: '' };
            mockRepo.createRule.mockResolvedValue(newRule);

            const result = await service.createRule('New Rule', 'new content');

            expect(mockRepo.createRule).toHaveBeenCalledWith('New Rule', 'new content');
            expect(result).toEqual(newRule);
        });

        it('should delegate updateRule to repository', async () => {
            const updatedRule: Rule = { id: '1', name: 'Updated Rule', content: 'updated content', isActive: true, createdAt: '', updatedAt: '' };
            mockRepo.updateRule.mockResolvedValue(updatedRule);

            const result = await service.updateRule('1', 'updated content', 'Updated Rule');

            expect(mockRepo.updateRule).toHaveBeenCalledWith('1', 'updated content', 'Updated Rule');
            expect(result).toEqual(updatedRule);
        });

        it('should delegate deleteRule to repository', async () => {
            mockRepo.deleteRule.mockResolvedValue(undefined);

            await service.deleteRule('1');

            expect(mockRepo.deleteRule).toHaveBeenCalledWith('1');
        });
    });

    // Master rules tests removed - methods no longer exist

    describe('loadRulesConfig', () => {
        it('should load existing config file', async () => {
            const mockConfig = { claude: { enabled: true, targetPath: '', global: true } };
            // repository.load mocked in setup
            mockRepo.load.mockResolvedValue(mockConfig);

            const result = await service.loadRulesConfig();

            expect(result).toEqual(mockConfig);
        });

        it('should return empty config if repo load returns empty', async () => {
            mockRepo.load.mockResolvedValue({});

            const result = await service.loadRulesConfig();

            expect(result).toEqual({});
        });


    });

    describe('saveRulesConfig', () => {
        it('should save valid config', async () => {
            const config = { claude: { enabled: true, targetPath: '/path', global: true } };

            await service.saveRulesConfig(config);

            expect(mockRepo.save).toHaveBeenCalledWith(config);
        });

        it('should throw error for unknown tool', async () => {
            const config = { unknown_tool: { enabled: true, targetPath: '', global: true } };

            await expect(service.saveRulesConfig(config)).rejects.toThrow();
        });
    });

    describe('syncToolRules', () => {
        beforeEach(() => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('# Master Rules');
        });

        it('should sync rules to tool with global path', async () => {
            mockRepo.load.mockResolvedValue({ claude: { enabled: true, targetPath: '', global: true } });
            mockRepo.getRule.mockResolvedValue({ id: 'rule-1', name: 'Rule 1', content: '# Content' });
            await service.syncToolRules('claude', '', true, 'overwrite', undefined, 'rule-1');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('CLAUDE.md'),
                expect.any(String)
            );
        });

        it('should sync rules to tool with project path', async () => {
            mockRepo.getRule.mockResolvedValue({ id: 'rule-1', name: 'Rule 1', content: '# Content' });
            await service.syncToolRules('claude', '/project/path', false, 'overwrite', undefined, 'rule-1');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                '/project/path/CLAUDE.md',
                expect.any(String)
            );
        });

        it('should throw error for unknown tool', async () => {
            await expect(
                service.syncToolRules('unknown_tool', '/path', true, 'overwrite')
            ).rejects.toThrow("Tool with id 'unknown_tool' not found");
        });

        it('should throw error when target path is required but not provided', async () => {
            mockRepo.getRule.mockResolvedValue({ id: 'rule-1', name: 'Rule 1', content: '# Content' });
            await expect(
                service.syncToolRules('claude', '', false, 'overwrite', undefined, 'rule-1')
            ).rejects.toThrow('Target path is required');
        });

        it('should throw error when tool does not support global rules', async () => {
            mockRepo.getRule.mockResolvedValue({ id: 'rule-1', name: 'Rule 1', content: '# Content' });
            await expect(
                service.syncToolRules('windsurf', '', true, 'overwrite', undefined, 'rule-1')
            ).rejects.toThrow('does not support global rules');
        });

        it('should sync specific rule by sourceId', async () => {
            const mockRule: Rule = { id: 'rule-1', name: 'Custom Rule', content: '# Custom Content', isActive: false, createdAt: '', updatedAt: '' };
            mockRepo.getRule.mockResolvedValue(mockRule);

            await service.syncToolRules('claude', '', true, 'overwrite', undefined, 'rule-1');

            expect(mockRepo.getRule).toHaveBeenCalledWith('rule-1');
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.any(String),
                expect.stringContaining('# Custom Content')
            );
        });

        it('should throw error if sourceId rule not found', async () => {
            mockRepo.getRule.mockResolvedValue(null);

            await expect(
                service.syncToolRules('claude', '', true, 'overwrite', undefined, 'nonexistent')
            ).rejects.toThrow("Rule with id 'nonexistent' not found");
            // Log result is not called if error is thrown early
        });

        it('returns error when project path missing for non-global tool', async () => {
            mockRepo.load.mockResolvedValue({
                tool1: { enabled: true, targetPath: '', global: false }
            });

            const results = await service.syncAllToolsRules('', 'overwrite', 'rule-1');

            const tool1Result = results.find(r => r.toolId === 'tool1');
            expect(tool1Result?.status).toBe('skipped');
            expect(tool1Result?.message).toContain('프로젝트 경로가 지정되지 않음');
        });

        it('returns error when syncToolRules throws', async () => {
            mockRepo.load.mockResolvedValue({
                tool1: { enabled: true, targetPath: '/p1', global: false },
            });
            const err = new Error('boom');
            vi.spyOn(service, 'syncToolRules').mockImplementation(async () => { throw err; });

            const results = await service.syncAllToolsRules('/p1', 'overwrite', 'rule-1');

            expect(results[0].status).toBe('error');
            expect(results[0].message).toBe('boom');
        });

        it('skips when global mode unsupported by tool', async () => {
            mockRepo.load.mockResolvedValue({
                tool2: { enabled: true, targetPath: '', global: true },
            });

            const results = await service.syncAllToolsRules('', 'overwrite', 'rule-1');

            const target = results.find(r => r.toolId === 'tool2');
            expect(target?.status).toBe('skipped');
            expect(target?.message).toContain('전역 Rules를 지원하지 않는 도구');
        });
    });

    describe('initRulesConfig', () => {
        it('should not reinitialize if config exists', async () => {
            mockRepo.load.mockResolvedValue({ some: 'config' });

            await service.initRulesConfig();

            expect(mockRepo.save).not.toHaveBeenCalled();
        });

        it('should create default config if not exists', async () => {
            mockRepo.load.mockResolvedValue({});

            await service.initRulesConfig();

            expect(mockRepo.save).toHaveBeenCalled();
        });
    });

    describe('listSupportedTools', () => {
        it('should return list of supported tool ids', () => {
            const result = service.listSupportedTools();

            expect(result).toContain('claude');
            expect(result).toContain('cursor');
        });
    });
});
