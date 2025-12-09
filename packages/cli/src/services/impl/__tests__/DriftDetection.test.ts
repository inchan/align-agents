import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { SyncService } from '../SyncService.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';

// Mock dependencies
const { mockStateService, mockChecksumService } = vi.hoisted(() => ({
    mockStateService: {
        updateState: vi.fn(),
        getState: vi.fn(),
    },
    mockChecksumService: {
        calculateStringChecksum: vi.fn(),
    }
}));

vi.mock('../StateService.js', () => ({
    StateService: class {
        constructor() { return mockStateService; }
        updateState = mockStateService.updateState;
        getState = mockStateService.getState;
    }
}));

vi.mock('../ChecksumService.js', () => ({
    ChecksumService: class {
        constructor() { return mockChecksumService; }
        calculateStringChecksum = mockChecksumService.calculateStringChecksum;
    }
}));

vi.mock('../../../infrastructure/repositories/McpRepository.js', () => ({
    McpRepository: class {
        getDefinitions = vi.fn().mockReturnValue([]);
        getSet = vi.fn();
    }
}));

vi.mock('../../../services/history.js', () => ({
    saveVersion: vi.fn(),
}));

vi.mock('../../../utils/backup.js', () => ({
    createTimestampedBackup: vi.fn(),
}));

vi.mock('../../../constants/tools.js', () => ({
    KNOWN_TOOLS: [],
    getToolMetadata: vi.fn(),
}));

vi.mock('@iarna/toml', () => ({
    parse: vi.fn((str) => JSON.parse(str)),
    stringify: vi.fn((obj) => JSON.stringify(obj)),
}));

describe('SyncService Drift Detection', () => {
    let service: SyncService;
    let mockFs: any;

    beforeEach(() => {
        vi.clearAllMocks();
        mockFs = {
            join: vi.fn((...parts) => parts.join('/')),
            exists: vi.fn().mockReturnValue(true),
            mkdir: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
        };

        service = new SyncService(mockFs as IFileSystem);
    });

    it('should warn when drift is detected using mocked services', async () => {
        // Setup scenarios
        // 1. Tool config exists
        mockFs.exists.mockReturnValue(true);

        // Mock readFile sequence:
        mockFs.readFile
            // 1. getGlobalConfig call
            .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
            // 2. loadMasterMcp call
            .mockReturnValueOnce(JSON.stringify({ mcpServers: { 'server1': { command: 'cmd' } } }))
            // 3. syncToolMcp (initial parse)
            .mockReturnValueOnce(JSON.stringify({ mcpServers: { 'server1': { modified: true } } }))
            // 4. syncToolMcp drift check (reading tool config)
            .mockReturnValueOnce(JSON.stringify({ mcpServers: { 'server1': { modified: true } } }));

        // 3. Checksum logic
        // Current content hash (drifted)
        mockChecksumService.calculateStringChecksum
            .mockReturnValueOnce('hash-drifted') // For the check
            .mockReturnValueOnce('hash-new');    // For the updateState

        // 4. State logic
        // Last known state was "hash-original"
        mockStateService.getState.mockReturnValue({ lastSyncHash: 'hash-original', lastSyncTime: '2023-01-01' });

        // 5. Spy on console.warn
        const warnSpy = vi.spyOn(console, 'warn');

        // Execute sync
        await service.syncToolMcp(
            'claude',
            '/path/to/config.json',
            null,
            'overwrite'
        );

        // Assertions
        expect(mockStateService.getState).toHaveBeenCalledWith('/path/to/config.json');

        // Should warn
        expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Drift detected'));

        // Should still update state with NEW hash
        expect(mockStateService.updateState).toHaveBeenCalledWith('/path/to/config.json', 'hash-new');
    });

    it('should NOT warn when hash matches', async () => {
        mockFs.exists.mockReturnValue(true);
        mockFs.readFile
            .mockReturnValueOnce(JSON.stringify({ masterDir: '/master', autoBackup: true }))
            .mockReturnValueOnce(JSON.stringify({ mcpServers: { 'server1': { command: 'cmd' } } }))
            .mockReturnValueOnce(JSON.stringify({ mcpServers: {} }))  // Initial parse
            .mockReturnValueOnce(JSON.stringify({ mcpServers: {} })); // Drift check

        mockChecksumService.calculateStringChecksum
            .mockReturnValueOnce('hash-same')
            .mockReturnValueOnce('hash-new');

        mockStateService.getState.mockReturnValue({ lastSyncHash: 'hash-same', lastSyncTime: '2023-01-01' });

        const warnSpy = vi.spyOn(console, 'warn');

        await service.syncToolMcp(
            'claude',
            '/path/to/config.json',
            null,
            'overwrite'
        );

        expect(warnSpy).not.toHaveBeenCalledWith(expect.stringContaining('Drift detected'));
    });
});
