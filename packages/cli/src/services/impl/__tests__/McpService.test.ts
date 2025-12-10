import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpService } from '../McpService.js';

// Mock database module
const mockDb = {
    prepare: vi.fn(),
    transaction: vi.fn(),
    exec: vi.fn(),
    close: vi.fn(),
    open: true
};

vi.mock('../../../infrastructure/database.js', () => ({
    getDatabase: vi.fn(() => mockDb),
    closeDatabase: vi.fn(),
    resetDatabase: vi.fn()
}));

// Mock McpRepository
const mockRepo = {
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
};

vi.mock('../../../infrastructure/repositories/McpRepository.js', () => ({
    McpRepository: class {
        constructor() {
            return mockRepo;
        }
    }
}));

describe('McpService', () => {
    let service: McpService;

    beforeEach(() => {
        vi.clearAllMocks();
        service = new McpService();
    });

    it('should delegate getMcpDefinitions to repository', async () => {
        mockRepo.getDefinitions.mockResolvedValue([]);
        await service.getMcpDefinitions();
        expect(mockRepo.getDefinitions).toHaveBeenCalled();
    });

    it('should delegate createMcpDefinition to repository', async () => {
        const def = { name: 'test', command: 'cmd', args: [] };
        mockRepo.createDefinition.mockResolvedValue({ id: '123', ...def });
        await service.createMcpDefinition(def);
        expect(mockRepo.createDefinition).toHaveBeenCalledWith(def);
    });

    it('should delegate getMcpSets to repository', async () => {
        mockRepo.getSets.mockResolvedValue([]);
        await service.getMcpSets();
        expect(mockRepo.getSets).toHaveBeenCalled();
    });

    it('should delegate createMcpSet to repository', async () => {
        const mockSet = {
            id: '123',
            name: 'name',
            items: [],
            description: 'desc',
            isActive: true,
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        mockRepo.createSet.mockResolvedValue(mockSet);
        await service.createMcpSet('name', [], 'desc');
        expect(mockRepo.createSet).toHaveBeenCalledWith('name', [], 'desc');
    });
});
