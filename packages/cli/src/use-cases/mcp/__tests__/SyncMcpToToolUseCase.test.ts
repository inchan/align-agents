import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncMcpToToolUseCase } from '../SyncMcpToToolUseCase.js';
import { ISyncService } from '../../../interfaces/ISyncService.js';
import { SyncMcpToToolRequest } from '../McpDTOs.js';

describe('SyncMcpToToolUseCase', () => {
    let useCase: SyncMcpToToolUseCase;
    let mockSyncService: ISyncService;

    beforeEach(() => {
        mockSyncService = {
            loadMasterMcp: vi.fn(),
            syncToolMcp: vi.fn(async () => []),
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

        useCase = new SyncMcpToToolUseCase(mockSyncService);
    });

    it('should successfully sync MCP servers to a tool', async () => {
        const request: SyncMcpToToolRequest = {
            toolId: 'claude-desktop',
            configPath: '/test/config.json',
            serverIds: ['server1', 'server2'],
            strategy: 'append',
        };

        const response = await useCase.execute(request);

        expect(mockSyncService.syncToolMcp).toHaveBeenCalledWith(
            'claude-desktop',
            '/test/config.json',
            ['server1', 'server2'],
            'append',
            undefined,
            undefined
        );
        expect(response.success).toBe(true);
        expect(response.syncedServers).toEqual(['server1', 'server2']);
    });

    it('should handle errors gracefully', async () => {
        vi.mocked(mockSyncService.syncToolMcp).mockImplementation(() => {
            throw new Error('Sync failed');
        });

        const request: SyncMcpToToolRequest = {
            toolId: 'claude-desktop',
            configPath: '/test/config.json',
            serverIds: ['server1'],
        };

        const response = await useCase.execute(request);

        expect(response.success).toBe(false);
        expect(response.message).toBe('Sync failed');
    });
});
