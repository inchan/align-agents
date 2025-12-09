import { beforeAll, describe, expect, it, vi } from 'vitest';

const rulesMocks = {
    loadMasterRules: vi.fn(),
    saveMasterRules: vi.fn(),
    loadRulesConfig: vi.fn(),
    saveRulesConfig: vi.fn(),
    syncToolRules: vi.fn(),
    syncAllToolsRules: vi.fn(),
    initRulesConfig: vi.fn(),
    listSupportedTools: vi.fn(),
};

let rulesApi: typeof import('../rules.js');

beforeAll(async () => {
    vi.resetModules();
    vi.doMock('../impl/RulesService.js', () => {
        class MockRulesService {
            loadMasterRules = rulesMocks.loadMasterRules;
            saveMasterRules = rulesMocks.saveMasterRules;
            loadRulesConfig = rulesMocks.loadRulesConfig;
            saveRulesConfig = rulesMocks.saveRulesConfig;
            syncToolRules = rulesMocks.syncToolRules;
            syncAllToolsRules = rulesMocks.syncAllToolsRules;
            initRulesConfig = rulesMocks.initRulesConfig;
            listSupportedTools = rulesMocks.listSupportedTools;
        }
        return { RulesService: MockRulesService };
    });
    vi.doMock('../infrastructure/NodeFileSystem.js', () => ({
        NodeFileSystem: class { },
    }));

    rulesApi = await import('../rules.js');
});

describe('rules adapter', () => {
    it('delegates master rules load/save', () => {
        rulesApi.loadMasterRules();
        expect(rulesMocks.loadMasterRules).toHaveBeenCalled();

        rulesApi.saveMasterRules('content');
        expect(rulesMocks.saveMasterRules).toHaveBeenCalledWith('content');
    });

    it('delegates config load/save', () => {
        rulesApi.loadRulesConfig();
        expect(rulesMocks.loadRulesConfig).toHaveBeenCalled();

        rulesApi.saveRulesConfig({ enabled: true } as any);
        expect(rulesMocks.saveRulesConfig).toHaveBeenCalledWith({ enabled: true });
    });

    it('delegates sync functions', () => {
        rulesApi.syncToolRules('t', 'path', true, 'overwrite', { skipBackup: true });
        expect(rulesMocks.syncToolRules).toHaveBeenCalledWith('t', 'path', true, 'overwrite', { skipBackup: true });

        rulesApi.syncAllToolsRules('/tmp', 'smart-update');
        expect(rulesMocks.syncAllToolsRules).toHaveBeenCalledWith('/tmp', 'smart-update');
    });

    it('gets tool rules filename from metadata', () => {
        expect(rulesApi.getToolRulesFilename('codex')).toBe('AGENTS.md');
        expect(rulesApi.getToolRulesFilename('missing')).toBeNull();
    });

    it('delegates init and list supported tools', () => {
        rulesApi.initRulesConfig();
        expect(rulesMocks.initRulesConfig).toHaveBeenCalled();

        rulesApi.listSupportedTools();
        expect(rulesMocks.listSupportedTools).toHaveBeenCalled();
    });
});
