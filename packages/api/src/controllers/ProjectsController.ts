import { Request, Response } from 'express';
import { ProjectService } from '@align-agents/cli';

export class ProjectsController {
    private projectService = ProjectService.getInstance();

    async getProjects(req: Request, res: Response) {
        try {
            const projects = this.projectService.getProjects();
            res.json(projects);
        } catch (error) {
            console.error('Error getting projects:', error);
            res.status(500).json({ error: 'Failed to get projects' });
        }
    }

    async createProject(req: Request, res: Response) {
        try {
            const { name, path, source } = req.body;
            if (!name || !path) {
                return res.status(400).json({ error: 'Name and path are required' });
            }
            const project = await this.projectService.createProject({
                name,
                path,
                source: source || 'manual'
            });
            res.json(project);
        } catch (error: any) {
            console.error('Error creating project:', error);
            res.status(500).json({ error: error.message || 'Failed to create project' });
        }
    }

    async updateProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const updates = req.body;
            const project = await this.projectService.updateProject(id, updates);
            res.json(project);
        } catch (error: any) {
            console.error('Error updating project:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.status(500).json({ error: 'Failed to update project' });
        }
    }

    async deleteProject(req: Request, res: Response) {
        try {
            const { id } = req.params;
            await this.projectService.deleteProject(id);
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error deleting project:', error);
            res.status(500).json({ error: 'Failed to delete project' });
        }
    }

    async getProjectDetails(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const details = await this.projectService.getProjectDetails(id);
            res.json(details);
        } catch (error: any) {
            console.error('Error getting project details:', error);
            if (error.message.includes('not found')) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.status(500).json({ error: 'Failed to get project details' });
        }
    }

    async scanProjects(req: Request, res: Response) {
        try {
            const projects = await this.projectService.scanAndMergeProjects();
            res.json(projects);
        } catch (error: any) {
            console.error('Error scanning projects:', error);
            res.status(500).json({ error: 'Failed to scan projects' });
        }
    }
}
