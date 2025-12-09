import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncRulesToToolUseCase } from '../SyncRulesToToolUseCase.js';
import { IRulesService } from '../../../interfaces/IRulesService.js';
import { SyncRulesToToolRequest } from '../RulesDTOs.js';

describe('SyncRulesToToolUseCase', () => {
    let useCase: SyncRulesToToolUseCase;
    let mockRulesService: IRulesService;

    beforeEach(() => {
        mockRulesService = {
            loadMasterRules: vi.fn(),
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

        useCase = new SyncRulesToToolUseCase(mockRulesService);
    });

    it('should successfully sync rules to a tool', async () => {
        const request: SyncRulesToToolRequest = {
            toolId: 'claude-desktop',
            targetPath: '/test/path',
            global: false,
            strategy: 'smart-update',
        };

        const response = await useCase.execute(request);

        expect(mockRulesService.syncToolRules).toHaveBeenCalledWith(
            'claude-desktop',
            '/test/path',
            false,
            'smart-update',
            undefined,
            undefined
        );
        expect(response.success).toBe(true);
        expect(response.toolId).toBe('claude-desktop');
        expect(response.targetPath).toBe('/test/path');
    });

    it('should handle errors gracefully', async () => {
        vi.mocked(mockRulesService.syncToolRules).mockImplementation(() => {
            throw new Error('Sync failed');
        });

        const request: SyncRulesToToolRequest = {
            toolId: 'claude-desktop',
            targetPath: '/test/path',
        };

        const response = await useCase.execute(request);

        expect(response.success).toBe(false);
        expect(response.message).toBe('Sync failed');
    });
});
