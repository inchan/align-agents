import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectService } from '../ProjectService.js';
import { ToolRepository } from '../../repositories/ToolRepository.js';

vi.mock('fs');
vi.mock('os');
vi.mock('../../repositories/ToolRepository.js');
vi.mock('../../repositories/ToolRepository.js');

const { mockGetAllRecentProjects } = vi.hoisted(() => ({
    mockGetAllRecentProjects: vi.fn().mockResolvedValue([])
}));

vi.mock('../ProjectScanner.js', () => ({
    ProjectScanner: class {
        getAllRecentProjects = mockGetAllRecentProjects;
    }
}));

describe('ProjectService', () => {
    const mockHomeDir = '/mock/home';
    const configPath = path.join(mockHomeDir, '.align-agents', 'projects.json');

    let mockFsContent = '[]';

    beforeEach(() => {
        vi.resetAllMocks();
        mockFsContent = '[]'; // Reset FS state

        vi.mocked(os.homedir).mockReturnValue(mockHomeDir);

        // Reset singleton (hacky)
        // @ts-ignore
        ProjectService.instance = null;

        // Default fs mocks
        vi.mocked(fs.existsSync).mockReturnValue(false);
        vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);
        vi.mocked(fs.writeFileSync).mockImplementation((path, data) => {
            mockFsContent = data as string;
        });
        vi.mocked(fs.readFileSync).mockImplementation(() => mockFsContent);
    });

    it('should be a singleton', () => {
        const i1 = ProjectService.getInstance();
        const i2 = ProjectService.getInstance();
        expect(i1).toBe(i2);
    });

    it('should initialize config file if missing', () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        ProjectService.getInstance();

        expect(fs.mkdirSync).toHaveBeenCalledWith(path.dirname(configPath), { recursive: true });
        expect(fs.writeFileSync).toHaveBeenCalledWith(configPath, expect.stringContaining('[]'));
    });

    describe('CRUD Operations', () => {
        it('should create a project', async () => {
            const service = ProjectService.getInstance();
            const project = await service.createProject({
                name: 'Test Project',
                path: '/path/to/project',
                source: 'manual',
                lastAccessed: new Date()
            });

            expect(project.id).toBeDefined();
            expect(project.name).toBe('Test Project');
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should get all projects sorted by update time', async () => {
            const p1 = { id: '1', name: 'Older', updatedAt: '2023-01-01T00:00:00Z' };
            const p2 = { id: '2', name: 'Newer', updatedAt: '2024-01-01T00:00:00Z' };
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([p1, p2]));

            const service = ProjectService.getInstance();
            const projects = service.getProjects();

            expect(projects[0].id).toBe('2');
            expect(projects[1].id).toBe('1');
        });

        it('should update a project', async () => {
            const p1 = { id: '1', name: 'Old Name', path: '/path', updatedAt: '2023-01-01T00:00:00Z' };
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([p1]));

            const service = ProjectService.getInstance();
            const updated = await service.updateProject('1', { name: 'New Name' });

            expect(updated.name).toBe('New Name');
            expect(updated.updatedAt > p1.updatedAt).toBe(true);
            expect(fs.writeFileSync).toHaveBeenCalled();
        });

        it('should delete a project', async () => {
            const p1 = { id: '1', name: 'To Delete' };
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([p1]));

            const service = ProjectService.getInstance();
            await service.deleteProject('1');

            const writeCall = vi.mocked(fs.writeFileSync).mock.calls.find(call => call[0] === configPath);
            expect(writeCall).toBeDefined();
            expect(JSON.parse(writeCall![1] as string)).toEqual([]);
        });
    });

    describe('scanAndMergeProjects', () => {
        it('should merge new scanned projects', async () => {
            // Mock Scanner
            const mockScanned = [
                { name: 'Scanned', path: '/scanned/path', source: 'ide', lastAccessed: '2024-01-01' }
            ];

            mockGetAllRecentProjects.mockResolvedValue(mockScanned);

            const service = ProjectService.getInstance();
            const results = await service.scanAndMergeProjects();

            expect(results).toHaveLength(1);
            expect(results[0].path).toBe('/scanned/path');
            expect(results[0].isAutoScanned).toBe(true);
        });
    });

    describe('getProjectDetails', () => {
        it('should gather tool details for project', async () => {
            const p1 = { id: '1', name: 'P1', path: '/p1' };
            vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify([p1]));

            // Mock ToolRepository
            const mockTools = [{ id: 'claude', name: 'Claude', exists: true }];
            const mockRepo = {
                load: vi.fn(),
                getTools: vi.fn().mockReturnValue(mockTools)
            };
            vi.mocked(ToolRepository.getInstance).mockReturnValue(mockRepo as any);

            // Mock Constants (needs separate mock block or dynamic import if possible, but let's try direct mock)
            vi.mock('../../constants/ToolDefinitions.js', () => ({
                TOOL_METADATA: [
                    { id: 'claude', name: 'Claude', rulesFilename: 'CLAUDE.md', supportsMcp: true }
                ]
            }));

            // Mock FS for project files checks
            vi.mocked(fs.existsSync).mockImplementation((p: any) => {
                if (p === '/p1/CLAUDE.md') return true;
                return false;
            });

            const service = ProjectService.getInstance();
            const details = await service.getProjectDetails('1');

            expect(details.id).toBe('1');
            expect(details.tools).toHaveLength(1);
            expect(details.tools[0].id).toBe('claude');
            expect(details.tools[0].hasRules).toBe(true);
        });
    });
});
