import { beforeAll, describe, expect, it, vi } from 'vitest';

const syncMocks = {
    getGlobalConfig: vi.fn(),
    saveGlobalConfig: vi.fn(),
    getMasterDir: vi.fn(),
    setMasterDir: vi.fn(),
    loadMasterMcp: vi.fn(),
    saveMasterMcp: vi.fn(),
    loadSyncConfig: vi.fn(),
    saveSyncConfig: vi.fn(),
    syncToolMcp: vi.fn(),
    syncAllTools: vi.fn(),
};

let syncApi: typeof import('../sync.js');

beforeAll(async () => {
    vi.resetModules();
    vi.doMock('../impl/SyncService.js', () => {
        class MockSyncService {
            getGlobalConfig = syncMocks.getGlobalConfig;
            saveGlobalConfig = syncMocks.saveGlobalConfig;
            getMasterDir = syncMocks.getMasterDir;
            setMasterDir = syncMocks.setMasterDir;
            loadMasterMcp = syncMocks.loadMasterMcp;
            saveMasterMcp = syncMocks.saveMasterMcp;
            loadSyncConfig = syncMocks.loadSyncConfig;
            saveSyncConfig = syncMocks.saveSyncConfig;
            syncToolMcp = syncMocks.syncToolMcp;
            syncAllTools = syncMocks.syncAllTools;
        }
        return { SyncService: MockSyncService };
    });
    vi.doMock('../infrastructure/NodeFileSystem.js', () => ({
        NodeFileSystem: class { },
    }));
    syncApi = await import('../sync.js');
});

describe('sync adapter', () => {
    it('delegates config accessors', () => {
        syncApi.getGlobalConfig();
        expect(syncMocks.getGlobalConfig).toHaveBeenCalled();
        syncApi.saveGlobalConfig({} as any);
        expect(syncMocks.saveGlobalConfig).toHaveBeenCalledWith({});

        syncApi.getMasterDir();
        expect(syncMocks.getMasterDir).toHaveBeenCalled();
        syncApi.setMasterDir('/tmp');
        expect(syncMocks.setMasterDir).toHaveBeenCalledWith('/tmp');
    });

    it('delegates master mcp and sync config', () => {
        syncApi.loadMasterMcp();
        expect(syncMocks.loadMasterMcp).toHaveBeenCalled();
        syncApi.saveMasterMcp({} as any);
        expect(syncMocks.saveMasterMcp).toHaveBeenCalledWith({});

        syncApi.loadSyncConfig();
        expect(syncMocks.loadSyncConfig).toHaveBeenCalled();
        syncApi.saveSyncConfig({} as any);
        expect(syncMocks.saveSyncConfig).toHaveBeenCalledWith({});
    });

    it('delegates sync operations', () => {
        syncApi.syncToolMcp('tool', '/path', ['a'], 'overwrite', { skipBackup: true });
        expect(syncMocks.syncToolMcp).toHaveBeenCalledWith('tool', '/path', ['a'], 'overwrite', { skipBackup: true });

        syncApi.syncAllTools();
        expect(syncMocks.syncAllTools).toHaveBeenCalledWith(undefined);
    });
});
