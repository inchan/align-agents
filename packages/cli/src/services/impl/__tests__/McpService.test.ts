import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpService } from '../McpService.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';

// Mock McpRepository
const { mockRepo } = vi.hoisted(() => ({
    mockRepo: {
        getDefinitions: vi.fn(),
        getDefinition: vi.fn(),
        createDefinition: vi.fn(),
        updateDefinition: vi.fn(),
        deleteDefinition: vi.fn(),
        getSets: vi.fn(),
        getSet: vi.fn(),
        createSet: vi.fn(),
        updateSet: vi.fn(),
        deleteSet: vi.fn(),
        setActiveSet: vi.fn(),
    },
}));

vi.mock('../../../infrastructure/repositories/McpRepository.js', () => {
    return {
        McpRepository: class {
            constructor() {
                return mockRepo;
            }
        }
    };
});

vi.mock('../../sync.js', () => ({
    getMasterDir: vi.fn(() => '/mock/master'),
}));

describe('McpService', () => {
    let service: McpService;
    let mockFs: IFileSystem;

    beforeEach(() => {
        mockFs = {
            join: vi.fn(),
            exists: vi.fn(),
            mkdir: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            relative: vi.fn(),
            dirname: vi.fn(),
            basename: vi.fn(),
        };

        service = new McpService(mockFs);
    });

    it('should delegate getMcpDefinitions to repository', async () => {
        mockRepo.getDefinitions.mockResolvedValue([]);
        await service.getMcpDefinitions();
        expect(mockRepo.getDefinitions).toHaveBeenCalled();
    });

    it('should delegate createMcpDefinition to repository', async () => {
        const def = { name: 'test', command: 'cmd', args: [] };
        await service.createMcpDefinition(def);
        expect(mockRepo.createDefinition).toHaveBeenCalledWith(def);
    });

    it('should delegate getMcpSets to repository', async () => {
        mockRepo.getSets.mockResolvedValue([]);
        await service.getMcpSets();
        expect(mockRepo.getSets).toHaveBeenCalled();
    });

    it('should delegate createMcpSet to repository', async () => {
        await service.createMcpSet('name', [], 'desc');
        expect(mockRepo.createSet).toHaveBeenCalledWith('name', [], 'desc');
    });
});
