import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoadMasterRulesUseCase } from '../LoadMasterRulesUseCase.js';
import { IRulesService } from '../../../interfaces/IRulesService.js';
import { LoadMasterRulesRequest } from '../RulesDTOs.js';

describe('LoadMasterRulesUseCase', () => {
    let useCase: LoadMasterRulesUseCase;
    let mockRulesService: IRulesService;

    beforeEach(() => {
        mockRulesService = {
            loadMasterRules: vi.fn(() => '# Master Rules\n\nTest content'),
            syncToolRules: vi.fn(),
            syncAllToolsRules: vi.fn(),
            loadRulesConfig: vi.fn(),
            saveRulesConfig: vi.fn(),
            initRulesConfig: vi.fn(),
            saveMasterRules: vi.fn(),
            listSupportedTools: vi.fn(),
            // Multi-rules management methods
            getRulesList: vi.fn(),
            getRule: vi.fn(),
            createRule: vi.fn(),
            updateRule: vi.fn(),
            deleteRule: vi.fn(),
            setActiveRule: vi.fn(),
        };

        useCase = new LoadMasterRulesUseCase(mockRulesService);
    });

    it('should load master rules', () => {
        const request: LoadMasterRulesRequest = {};

        const response = useCase.execute(request);

        expect(mockRulesService.loadMasterRules).toHaveBeenCalled();
        expect(response.content).toBe('# Master Rules\n\nTest content');
        expect(response.path).toContain('master-rules.md');
    });
});
