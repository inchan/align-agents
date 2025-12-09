import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RulesService } from '../impl/RulesService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import * as syncModule from '../../services/sync.js';
import * as toolsModule from '../../constants/tools.js';
import * as backupModule from '../../utils/backup.js';
import * as historyModule from '../../services/history.js';
import * as svcBackupModule from '../../services/backup.js';

// 모킹 설정
vi.mock('../../services/sync.js');
vi.mock('../../constants/tools.js');
vi.mock('../../utils/backup.js');
vi.mock('../../services/history.js');
vi.mock('../../services/backup.js', () => ({
    createBackup: vi.fn(),
}));

describe('RulesService', () => {
    let rulesService: RulesService;
    let mockFs: IFileSystem;

    const mockMasterDir = '/mock/master';
    const mockRulesPath = '/mock/master/master-rules.md';
    const mockMasterContent = '# Master Rules';

    beforeEach(() => {
        vi.resetAllMocks();

        // Mock FileSystem
        mockFs = {
            exists: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            join: vi.fn((...args) => args.join('/')),
            dirname: vi.fn(),
            basename: vi.fn(),
            relative: vi.fn((from, to) => to.replace(from, '').replace(/^\//, '')),
            unlink: vi.fn(),
        };

        rulesService = new RulesService(mockFs, '/mock/master');

        // 기본 모킹 동작 설정
        vi.mocked(syncModule.getMasterDir).mockReturnValue(mockMasterDir);
        vi.mocked(syncModule.getGlobalConfig).mockReturnValue({ masterDir: mockMasterDir, autoBackup: false } as any);
        vi.mocked(toolsModule.getRulesCapableTools).mockReturnValue([
            { id: 'tool1', name: 'Tool 1', rulesFilename: 'RULES.md', globalRulesDir: '/global/tool1' },
            { id: 'tool2', name: 'Tool 2', rulesFilename: '.rules', globalRulesDir: undefined }
        ] as any);
        vi.mocked(toolsModule.getToolMetadata).mockImplementation((id) => {
            if (id === 'tool1') return { id: 'tool1', name: 'Tool 1', rulesFilename: 'RULES.md', globalRulesDir: '/global/tool1' } as any;
            if (id === 'tool2') return { id: 'tool2', name: 'Tool 2', rulesFilename: '.rules' } as any;
            return undefined;
        });

        // FS 모킹 기본값
        vi.mocked(mockFs.exists).mockReturnValue(true);
        vi.mocked(mockFs.readFile).mockReturnValue(mockMasterContent);

        // 백업 모킹
        vi.spyOn(backupModule, 'createTimestampedBackup').mockReturnValue(null);
    });

    describe('loadMasterRules', () => {
        it('should return master rules content if file exists', () => {
            const content = rulesService.loadMasterRules();
            expect(content).toBe(mockMasterContent);
            expect(mockFs.readFile).toHaveBeenCalledWith(mockRulesPath);
        });

        it('should create default rules if file does not exist', () => {
            vi.mocked(mockFs.exists).mockImplementation((p) => p === mockMasterDir);

            const content = rulesService.loadMasterRules();

            expect(mockFs.writeFile).toHaveBeenCalledWith(mockRulesPath, expect.stringContaining('# 프로젝트 Rules'));
            expect(content).toContain('# 프로젝트 Rules');
        });
    });

    describe('saveMasterRules', () => {
        it('saves rules, creates dir, and triggers backup when enabled', async () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);
            vi.mocked(syncModule.getGlobalConfig).mockReturnValue({ masterDir: mockMasterDir, autoBackup: true } as any);

            await rulesService.saveMasterRules('new content');

            expect(mockFs.mkdir).toHaveBeenCalledWith(mockMasterDir);
            expect(mockFs.writeFile).toHaveBeenCalledWith(mockRulesPath, 'new content');
            expect(historyModule.saveVersion).toHaveBeenCalledWith('rules', 'new content', expect.any(String));
            expect(svcBackupModule.createBackup).toHaveBeenCalledWith('Auto-backup: Rules updated');
        });

        it('swallows saveVersion errors but still writes file', async () => {
            vi.mocked(historyModule.saveVersion).mockImplementation(() => { throw new Error('fail'); });

            await rulesService.saveMasterRules('content');

            expect(mockFs.writeFile).toHaveBeenCalledWith(mockRulesPath, 'content');
        });
    });

    describe('syncToolRules', () => {
        it('should sync rules using overwrite strategy', async () => {
            const targetPath = '/project';
            const expectedPath = '/project/RULES.md';

            await rulesService.syncToolRules('tool1', targetPath, false, 'overwrite');

            expect(mockFs.writeFile).toHaveBeenCalledWith(expectedPath, mockMasterContent);
        });

        it('should sync rules using merge strategy', async () => {
            const targetPath = '/project';
            const expectedPath = '/project/RULES.md';
            const existingContent = 'Existing Rules';

            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p === mockRulesPath) return mockMasterContent;
                if (p === expectedPath) return existingContent;
                return '';
            });

            await rulesService.syncToolRules('tool1', targetPath, false, 'append');

            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expectedPath,
                expect.stringContaining(existingContent)
            );
            expect(mockFs.writeFile).toHaveBeenCalledWith(
                expectedPath,
                expect.stringContaining(mockMasterContent)
            );
        });

        it('writes to global rules directory when global flag is true', async () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);

            await rulesService.syncToolRules('tool1', '', true, 'overwrite');

            expect(mockFs.mkdir).toHaveBeenCalledWith('/global/tool1');
            expect(mockFs.writeFile).toHaveBeenCalledWith('/global/tool1/RULES.md', expect.any(String));
        });
    });

    describe('syncAllToolsRules', () => {
        it('should sync all enabled tools', async () => {
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p.endsWith('rules-config.json')) {
                    return JSON.stringify({
                        tool1: { enabled: true, targetPath: '/p1' },
                        tool2: { enabled: false }
                    });
                }
                return mockMasterContent;
            });

            const results = await rulesService.syncAllToolsRules('/default/path', 'overwrite', 'rule-1');

            expect(results).toHaveLength(2);
            expect(results.find(r => r.toolId === 'tool1')?.status).toBe('success');
            expect(results.find(r => r.toolId === 'tool2')?.status).toBe('skipped');
        });

        it('returns error when project path missing for non-global tool', async () => {
            vi.mocked(mockFs.readFile).mockImplementation((p) => {
                if (p.endsWith('rules-config.json')) {
                    return JSON.stringify({
                        tool1: { enabled: true, targetPath: '', global: false }
                    });
                }
                return mockMasterContent;
            });

            const results = await rulesService.syncAllToolsRules('', 'overwrite', 'rule-1');

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
                return mockMasterContent;
            });
            const err = new Error('boom');
            vi.spyOn(rulesService, 'syncToolRules').mockImplementation(async () => { throw err; });

            const results = await rulesService.syncAllToolsRules('/p1', 'overwrite', 'rule-1');

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
                return mockMasterContent;
            });

            const results = await rulesService.syncAllToolsRules('', 'overwrite', 'rule-1');

            const target = results.find(r => r.toolId === 'tool2');
            expect(target?.status).toBe('skipped');
            expect(target?.message).toContain('전역 Rules를 지원하지 않는 도구');
        });
    });

    describe('rules config validation', () => {
        it('throws when saving config with unknown tool', () => {
            expect(() => rulesService.saveRulesConfig({ unknown: { enabled: true, targetPath: '', global: false } })).toThrowError('Unknown tool in rules-config');
        });

        it('creates master dir and writes when saving valid config', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);

            rulesService.saveRulesConfig({ tool1: { enabled: true, targetPath: '', global: false } });

            expect(mockFs.mkdir).toHaveBeenCalledWith(mockMasterDir);
            expect(mockFs.writeFile).toHaveBeenCalledWith(`${mockMasterDir}/rules-config.json`, expect.any(String));
        });

        it('returns empty config on parse error', () => {
            vi.mocked(mockFs.exists).mockReturnValue(true);
            vi.mocked(mockFs.readFile).mockImplementation(() => 'not-json');

            const config = rulesService.loadRulesConfig();

            expect(config).toEqual({});
        });

        it('returns empty config when file is missing', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);

            const config = rulesService.loadRulesConfig();

            expect(config).toEqual({});
        });
    });

    describe('initRulesConfig', () => {
        it('creates default config when missing', () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);
            const saveSpy = vi.spyOn(rulesService, 'saveRulesConfig').mockImplementation(() => { });

            rulesService.initRulesConfig();

            expect(saveSpy).toHaveBeenCalled();
        });

        it('skips creation when config already exists', () => {
            vi.mocked(mockFs.exists).mockReturnValue(true);
            const saveSpy = vi.spyOn(rulesService, 'saveRulesConfig').mockImplementation(() => { });

            rulesService.initRulesConfig();

            expect(saveSpy).not.toHaveBeenCalled();
        });
    });

    describe('syncToolRules validation', () => {
        it('throws when tool is unknown', async () => {
            await expect(rulesService.syncToolRules('unknown', '/p', false, 'overwrite')).rejects.toThrowError('Unknown tool');
        });

        it('throws when global dir is not supported', async () => {
            await expect(rulesService.syncToolRules('tool2', '', true, 'overwrite')).rejects.toThrowError('Tool tool2 does not support global rules');
        });

        it('throws when project target path is missing', async () => {
            await expect(rulesService.syncToolRules('tool1', '', false, 'overwrite')).rejects.toThrowError('Target path is required');
        });

        it('throws when project target path does not exist', async () => {
            vi.mocked(mockFs.exists).mockReturnValue(false);
            await expect(rulesService.syncToolRules('tool1', '/missing', false, 'overwrite')).rejects.toThrowError('Target path does not exist');
        });
    });

    describe('listSupportedTools', () => {
        it('returns tool ids from metadata', () => {
            const ids = rulesService.listSupportedTools();
            expect(ids).toEqual(['tool1', 'tool2']);
        });
    });
});
