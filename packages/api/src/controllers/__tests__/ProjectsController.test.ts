import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ProjectsController } from '../ProjectsController.js';

const mockProjectService = {
    getProjects: vi.fn(),
    createProject: vi.fn(),
    updateProject: vi.fn(),
    deleteProject: vi.fn(),
    getProjectDetails: vi.fn(),
    scanAndMergeProjects: vi.fn(),
};

vi.mock('@align-agents/cli', () => ({
    ProjectService: {
        getInstance: () => mockProjectService,
    },
}));

function createRes() {
    const res: any = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.body = payload;
            return this;
        },
    };
    return res;
}

describe('ProjectsController', () => {
    let controller: ProjectsController;

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new ProjectsController();
    });

    describe('getProjects', () => {
        it('returns list of projects', async () => {
            const projects = [
                { id: 'p1', name: 'Project 1', path: '/path/1' },
                { id: 'p2', name: 'Project 2', path: '/path/2' },
            ];
            mockProjectService.getProjects.mockReturnValue(projects);

            const res = createRes();
            await controller.getProjects({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(projects);
        });

        it('returns 500 on error', async () => {
            mockProjectService.getProjects.mockImplementation(() => {
                throw new Error('Database error');
            });

            const res = createRes();
            await controller.getProjects({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get projects');
        });
    });

    describe('createProject', () => {
        it('returns 400 when name is missing', async () => {
            const req = { body: { path: '/some/path' } } as any;
            const res = createRes();

            await controller.createProject(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Name and path are required');
        });

        it('returns 400 when path is missing', async () => {
            const req = { body: { name: 'My Project' } } as any;
            const res = createRes();

            await controller.createProject(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Name and path are required');
        });

        it('creates project with default source', async () => {
            const project = { id: 'p1', name: 'My Project', path: '/path', source: 'manual' };
            mockProjectService.createProject.mockResolvedValue(project);

            const req = { body: { name: 'My Project', path: '/path' } } as any;
            const res = createRes();

            await controller.createProject(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(project);
            expect(mockProjectService.createProject).toHaveBeenCalledWith({
                name: 'My Project',
                path: '/path',
                source: 'manual',
            });
        });

        it('creates project with custom source', async () => {
            const project = { id: 'p1', name: 'My Project', path: '/path', source: 'vscode' };
            mockProjectService.createProject.mockResolvedValue(project);

            const req = { body: { name: 'My Project', path: '/path', source: 'vscode' } } as any;
            const res = createRes();

            await controller.createProject(req, res);

            expect(mockProjectService.createProject).toHaveBeenCalledWith({
                name: 'My Project',
                path: '/path',
                source: 'vscode',
            });
        });

        it('returns 500 on error', async () => {
            mockProjectService.createProject.mockRejectedValue(new Error('Creation failed'));

            const req = { body: { name: 'My Project', path: '/path' } } as any;
            const res = createRes();

            await controller.createProject(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Creation failed');
        });
    });

    describe('updateProject', () => {
        it('updates project successfully', async () => {
            const updatedProject = { id: 'p1', name: 'Updated', path: '/path' };
            mockProjectService.updateProject.mockResolvedValue(updatedProject);

            const req = { params: { id: 'p1' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateProject(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(updatedProject);
            expect(mockProjectService.updateProject).toHaveBeenCalledWith('p1', { name: 'Updated' });
        });

        it('returns 404 when project not found', async () => {
            mockProjectService.updateProject.mockRejectedValue(new Error('Project not found'));

            const req = { params: { id: 'nonexistent' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateProject(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Project not found');
        });

        it('returns 500 on other errors', async () => {
            mockProjectService.updateProject.mockRejectedValue(new Error('Database error'));

            const req = { params: { id: 'p1' }, body: { name: 'Updated' } } as any;
            const res = createRes();

            await controller.updateProject(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to update project');
        });
    });

    describe('deleteProject', () => {
        it('deletes project successfully', async () => {
            mockProjectService.deleteProject.mockResolvedValue(undefined);

            const req = { params: { id: 'p1' } } as any;
            const res = createRes();

            await controller.deleteProject(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockProjectService.deleteProject).toHaveBeenCalledWith('p1');
        });

        it('returns 500 on error', async () => {
            mockProjectService.deleteProject.mockRejectedValue(new Error('Delete failed'));

            const req = { params: { id: 'p1' } } as any;
            const res = createRes();

            await controller.deleteProject(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to delete project');
        });
    });

    describe('getProjectDetails', () => {
        it('returns project details', async () => {
            const details = { id: 'p1', path: '/path', tools: [] };
            mockProjectService.getProjectDetails.mockResolvedValue(details);

            const req = { params: { id: 'p1' } } as any;
            const res = createRes();

            await controller.getProjectDetails(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(details);
        });

        it('returns 404 when project not found', async () => {
            mockProjectService.getProjectDetails.mockRejectedValue(new Error('Project not found'));

            const req = { params: { id: 'nonexistent' } } as any;
            const res = createRes();

            await controller.getProjectDetails(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('Project not found');
        });

        it('returns 500 on other errors', async () => {
            mockProjectService.getProjectDetails.mockRejectedValue(new Error('Database error'));

            const req = { params: { id: 'p1' } } as any;
            const res = createRes();

            await controller.getProjectDetails(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get project details');
        });
    });

    describe('scanProjects', () => {
        it('scans and returns merged projects', async () => {
            const projects = [
                { id: 'p1', name: 'Project 1', path: '/path/1' },
                { id: 'p2', name: 'Project 2', path: '/path/2' },
            ];
            mockProjectService.scanAndMergeProjects.mockResolvedValue(projects);

            const res = createRes();
            await controller.scanProjects({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual(projects);
        });

        it('returns 500 on error', async () => {
            mockProjectService.scanAndMergeProjects.mockRejectedValue(new Error('Scan failed'));

            const res = createRes();
            await controller.scanProjects({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to scan projects');
        });
    });
});
