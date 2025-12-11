import { Request, Response } from 'express';
import { ProjectService } from '@align-agents/cli';

/**
 * 프로젝트 CRUD 및 스캔 컨트롤러
 */
export class ProjectsController {
    private projectService = ProjectService.getInstance();

    /**
     * 등록된 모든 프로젝트 목록을 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns UserProject 배열 (updatedAt 기준 내림차순 정렬)
     * @throws 500 - 조회 실패
     */
    async getProjects(req: Request, res: Response) {
        try {
            const projects = this.projectService.getProjects();
            res.json(projects);
        } catch (error) {
            console.error('Error getting projects:', error);
            res.status(500).json({ error: 'Failed to get projects' });
        }
    }

    /**
     * 새 프로젝트를 생성한다.
     * @param req - Express Request (body: { name, path, source? })
     * @param res - Express Response
     * @returns 생성된 UserProject
     * @throws 400 - name 또는 path 누락
     * @throws 500 - 생성 실패
     */
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

    /**
     * 프로젝트 정보를 수정한다.
     * @param req - Express Request (params.id: 프로젝트 ID, body: 수정할 필드)
     * @param res - Express Response
     * @returns 수정된 UserProject
     * @throws 404 - 프로젝트 없음
     * @throws 500 - 수정 실패
     */
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

    /**
     * 프로젝트를 삭제한다.
     * @param req - Express Request (params.id: 프로젝트 ID)
     * @param res - Express Response
     * @returns { success: true }
     * @throws 500 - 삭제 실패
     */
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

    /**
     * 프로젝트 상세 정보를 조회한다. (프로젝트별 도구 설정 포함)
     * @param req - Express Request (params.id: 프로젝트 ID)
     * @param res - Express Response
     * @returns 프로젝트 상세 정보 (id, path, tools[])
     * @throws 404 - 프로젝트 없음
     * @throws 500 - 조회 실패
     */
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

    /**
     * IDE 등에서 최근 프로젝트를 스캔하여 기존 목록과 병합한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns 병합된 UserProject 배열
     * @throws 500 - 스캔 실패
     */
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
