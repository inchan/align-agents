import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoadMasterMcpUseCase } from '../LoadMasterMcpUseCase.js';
import { ISyncService } from '../../../interfaces/ISyncService.js';
import { LoadMasterMcpRequest } from '../McpDTOs.js';

describe('LoadMasterMcpUseCase', () => {
    let useCase: LoadMasterMcpUseCase;
    let mockSyncService: ISyncService;

    beforeEach(() => {
        mockSyncService = {
            loadMasterMcp: vi.fn(() => ({
                mcpServers: {
                    'server1': { command: 'node', args: ['server1.js'] },
                    'server2': { command: 'python', args: ['-m', 'server2'] },
                },
            })),
            syncToolMcp: vi.fn(),
            syncAllTools: vi.fn(),
            loadSyncConfig: vi.fn(),
            saveSyncConfig: vi.fn(),
            getGlobalConfig: vi.fn(),
            saveGlobalConfig: vi.fn(),
            getMasterDir: vi.fn(),
            setMasterDir: vi.fn(),
            saveMasterMcp: vi.fn(),
            syncTool: vi.fn(),
        };

        useCase = new LoadMasterMcpUseCase(mockSyncService);
    });

    it('should load master MCP configuration', () => {
        const request: LoadMasterMcpRequest = {};

        const response = useCase.execute(request);

        expect(mockSyncService.loadMasterMcp).toHaveBeenCalled();
        expect(response.mcpServers).toHaveProperty('server1');
        expect(response.mcpServers).toHaveProperty('server2');
        expect(response.path).toContain('master-mcp.json');
    });
});
