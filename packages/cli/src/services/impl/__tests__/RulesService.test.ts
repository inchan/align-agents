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
        setActiveRule: vi.fn(),
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
        };
        return tools[id] || null;
    }),
    getRulesCapableTools: vi.fn(() => [
        { id: 'claude', name: 'Claude', rulesFilename: 'CLAUDE.md', globalRulesDir: '/home/user/.claude' },
        { id: 'cursor', name: 'Cursor', rulesFilename: '.cursorrules', globalRulesDir: '/home/user/.cursor' },
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
            const newRule: Rule = { id: '2', name: 'New Rule', content: 'new content', isActive: false, createdAt: '', updatedAt: '' };
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

        it('should delegate setActiveRule to repository', async () => {
            mockRepo.setActiveRule.mockResolvedValue(undefined);

            await service.setActiveRule('1');

            expect(mockRepo.setActiveRule).toHaveBeenCalledWith('1');
        });
    });

    // Master rules tests removed - methods no longer exist

    describe('loadRulesConfig', () => {
        it('should load existing config file', () => {
            const mockConfig = { claude: { enabled: true, targetPath: '', global: true } };
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue(JSON.stringify(mockConfig));

            const result = service.loadRulesConfig();

            expect(result).toEqual(mockConfig);
        });

        it('should return empty config and initialize if file does not exist', () => {
            mockFs.exists = vi.fn()
                .mockReturnValueOnce(false)  // configPath does not exist initially
                .mockReturnValueOnce(true);  // after init, it exists

            mockFs.readFile = vi.fn().mockReturnValue('{}');

            const result = service.loadRulesConfig();

            expect(result).toEqual({});
        });

        it('should handle parse errors gracefully', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('invalid json');

            const result = service.loadRulesConfig();

            expect(result).toEqual({});
        });
    });

    describe('saveRulesConfig', () => {
        it('should save valid config', () => {
            const config = { claude: { enabled: true, targetPath: '/path', global: true } };
            mockFs.exists = vi.fn().mockReturnValue(true);

            service.saveRulesConfig(config);

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('rules-config.json'),
                expect.stringContaining('"claude"')
            );
        });

        it('should throw error for unknown tool', () => {
            const config = { unknown_tool: { enabled: true, targetPath: '', global: true } };

            expect(() => service.saveRulesConfig(config)).toThrow();
        });
    });

    describe('syncToolRules', () => {
        beforeEach(() => {
            mockFs.exists = vi.fn().mockReturnValue(true);
            mockFs.readFile = vi.fn().mockReturnValue('# Master Rules');
        });

        it('should sync rules to tool with global path', async () => {
            await service.syncToolRules('claude', '', true, 'overwrite');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expect.stringContaining('CLAUDE.md'),
                expect.any(String)
            );
        });

        it('should sync rules to tool with project path', async () => {
            await service.syncToolRules('claude', '/project/path', false, 'overwrite');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                '/project/path/CLAUDE.md',
                expect.any(String)
            );
        });

        it('should throw error for unknown tool', async () => {
            await expect(
                service.syncToolRules('unknown_tool', '/path', true, 'overwrite')
            ).rejects.toThrow('Unknown tool: unknown_tool');
        });

        it('should throw error when target path is required but not provided', async () => {
            await expect(
                service.syncToolRules('claude', '', false, 'overwrite')
            ).rejects.toThrow('Target path is required');
        });

        it('should throw error when tool does not support global rules', async () => {
            await expect(
                service.syncToolRules('windsurf', '', true, 'overwrite')
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
            ).rejects.toThrow('Rule not found');
            expect(mockSyncLogger.logResult).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'rules',
                    toolId: 'claude',
                    status: 'success',
                })
            );
        });

        it('returns error when project path missing for non-global tool', async () => {
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p.endsWith('rules-config.json')) {
                    return JSON.stringify({
                        tool1: { enabled: true, targetPath: '', global: false }
                    });
                }
                return '# Master Rules';
            });

            const results = await service.syncAllToolsRules('', 'overwrite', 'rule-1');

            const tool1Result = results.find(r => r.toolId === 'tool1');
            expect(tool1Result?.status).toBe('skipped');
            expect(tool1Result?.message).toContain('프로젝트 경로가 지정되지 않음');
        });

        it('returns error when syncToolRules throws', async () => {
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p.endsWith('rules-config.json')) {
                    return JSON.stringify({
                        tool1: { enabled: true, targetPath: '/p1', global: false },
                    });
                }
                return '# Master Rules';
            });
            const err = new Error('boom');
            vi.spyOn(service, 'syncToolRules').mockImplementation(async () => { throw err; });

            const results = await service.syncAllToolsRules('/p1', 'overwrite', 'rule-1');

            expect(results[0].status).toBe('error');
            expect(results[0].message).toBe('boom');
        });

        it('skips when global mode unsupported by tool', async () => {
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p.endsWith('rules-config.json')) {
                    return JSON.stringify({
                        tool2: { enabled: true, targetPath: '', global: true },
                    });
                }
                return '# Master Rules';
            });

            const results = await service.syncAllToolsRules('', 'overwrite', 'rule-1');

            const target = results.find(r => r.toolId === 'tool2');
            expect(target?.status).toBe('skipped');
            expect(target?.message).toContain('전역 Rules를 지원하지 않는 도구');
        });
    });

    describe('initRulesConfig', () => {
        it('should not reinitialize if config exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(true);

            service.initRulesConfig();

            expect(mockFs.writeFile).not.toHaveBeenCalled();
        });

        it('should create default config if not exists', () => {
            mockFs.exists = vi.fn().mockReturnValue(false);

            service.initRulesConfig();

            expect(mockFs.writeFile).toHaveBeenCalled();
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
