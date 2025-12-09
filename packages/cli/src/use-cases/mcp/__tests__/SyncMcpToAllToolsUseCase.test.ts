import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SyncMcpToAllToolsUseCase } from '../SyncMcpToAllToolsUseCase.js';
import { ISyncService } from '../../../interfaces/ISyncService.js';
import { scanForTools } from '../../../services/scanner.js';

vi.mock('../../../services/scanner.js', () => ({
    scanForTools: vi.fn(),
}));

describe('SyncMcpToAllToolsUseCase', () => {
    let useCase: SyncMcpToAllToolsUseCase;
    let mockSyncService: ISyncService;

    const mockTools = [
        { id: 'tool-1', name: 'Tool 1', configPath: '/path/one', exists: true },
        { id: 'tool-2', name: 'Tool 2', configPath: '/path/two', exists: false },
    ];

    beforeEach(() => {
        vi.resetAllMocks();

        mockSyncService = {
            loadMasterMcp: vi.fn(),
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

        useCase = new SyncMcpToAllToolsUseCase(mockSyncService);
    });

    it('should scan for tools when registry is not provided and map statuses', async () => {
        vi.mocked(scanForTools).mockResolvedValue(mockTools);
        vi.mocked(mockSyncService.syncAllTools).mockResolvedValue([
            { toolId: 'tool-1', name: 'Tool 1', path: '/path/one', status: 'success' as const, servers: ['a'] },
            { toolId: 'tool-2', name: 'Tool 2', path: '/path/two', status: 'unsupported' as const },
            { toolId: 'tool-4', name: 'Tool 4', path: '/path/four', status: 'skipped' as const, message: 'disabled' },
            { toolId: 'tool-3', name: 'Tool 3', path: '/path/three', status: 'error' as const, message: 'boom' },
        ]);

        const response = await useCase.execute({});

        expect(scanForTools).toHaveBeenCalled();
        expect(await mockSyncService.syncAllTools).toHaveBeenCalledWith(undefined, mockTools);
        expect(response.results).toEqual([
            { toolId: 'tool-1', status: 'success', configPath: '/path/one', syncedServers: ['a'] },
            { toolId: 'tool-2', status: 'skipped', configPath: '/path/two', syncedServers: undefined, message: undefined },
            { toolId: 'tool-4', status: 'skipped', configPath: '/path/four', syncedServers: undefined, message: 'disabled' },
            { toolId: 'tool-3', status: 'error', configPath: '/path/three', syncedServers: undefined, message: 'boom' },
        ]);
    });

    it('should use provided registry without scanning', async () => {
        const registry = { tools: [{ id: 'tool-x', name: 'Tool X', configPath: '/cfg', exists: true }] };
        vi.mocked(mockSyncService.syncAllTools).mockResolvedValue([]);

        const response = await useCase.execute({ registry, strategy: 'append' });

        expect(scanForTools).not.toHaveBeenCalled();
        expect(mockSyncService.syncAllTools).toHaveBeenCalledWith(undefined, registry.tools);
        expect(response.results).toEqual([]);
        expect(response).toBeTruthy();
    });
});
