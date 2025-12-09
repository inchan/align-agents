import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncRulesToAllToolsUseCase } from '../SyncRulesToAllToolsUseCase.js';
import { IRulesService } from '../../../interfaces/IRulesService.js';
import { SyncRulesToAllToolsRequest } from '../RulesDTOs.js';

describe('SyncRulesToAllToolsUseCase', () => {
    let useCase: SyncRulesToAllToolsUseCase;
    let mockRulesService: IRulesService;

    beforeEach(() => {
        mockRulesService = {
            loadMasterRules: vi.fn(),
            syncToolRules: vi.fn(),
            syncAllToolsRules: vi.fn().mockResolvedValue([
                {
                    toolId: 'claude-desktop',
                    toolName: 'Claude Desktop',
                    status: 'success' as const,
                    targetPath: '/test/path',
                    rulesFilename: 'CLAUDE.md',
                },
                {
                    toolId: 'cursor',
                    toolName: 'Cursor',
                    status: 'skipped' as const,
                    message: 'Not installed',
                    rulesFilename: 'CURSOR.md',
                },
                {
                    toolId: 'unsupported',
                    toolName: 'Unsupported',
                    status: 'not-supported' as const,
                    message: 'No global',
                    rulesFilename: 'NONE',
                },
                {
                    toolId: 'error-tool',
                    toolName: 'Error Tool',
                    status: 'error' as const,
                    message: 'boom',
                    rulesFilename: 'ERR.md',
                },
            ]),
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

        useCase = new SyncRulesToAllToolsUseCase(mockRulesService);
    });

    it('should sync rules to all tools', async () => {
        const request: SyncRulesToAllToolsRequest = {
            targetPath: '/test/path',
            strategy: 'smart-update',
        };

        const response = await useCase.execute(request);

        expect(mockRulesService.syncAllToolsRules).toHaveBeenCalledWith(
            '/test/path',
            'smart-update',
            undefined
        );
        expect(response.results).toHaveLength(4);
        expect(response.results[0].status).toBe('success');
        expect(response.results[1].status).toBe('skipped');
        expect(response.results[2].status).toBe('skipped');
        expect(response.results[3].status).toBe('error');
    });

    it('should default strategy when not provided', async () => {
        const response = await useCase.execute({ targetPath: '/test/path' });

        expect(mockRulesService.syncAllToolsRules).toHaveBeenCalledWith('/test/path', 'overwrite', undefined);
        expect(response.results.length).toBeGreaterThan(0);
    });
});
