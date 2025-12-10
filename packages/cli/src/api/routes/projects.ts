import { FastifyInstance } from 'fastify';
import { ProjectService } from '../../services/ProjectService.js';
import fs from 'fs';

export async function projectRoutes(server: FastifyInstance) {
    server.get('/api/projects', async () => {
        return ProjectService.getInstance().getProjects();
    });

    server.post<{ Body: any }>('/api/projects', async (request, reply) => {
        console.log('[API] Creating project with body:', request.body);
        try {
            fs.appendFileSync('/tmp/project-request.log', `[${new Date().toISOString()}] Request: ${JSON.stringify(request.body)}\n`);
        } catch (e) { /* ignore logging error */ }

        try {
            return await ProjectService.getInstance().createProject(request.body as any);
        } catch (error: any) {
            console.error('[API] Create project failed:', error);
            try {
                fs.appendFileSync('/tmp/project-error.log', `[${new Date().toISOString()}] Error: ${error.message}\nStack: ${error.stack}\n`);
            } catch (e) { /* ignore logging error */ }

            return reply.code(500).send({
                error: error.message || 'Unknown error',
                details: error.stack
            });
        }
    });

    server.put<{ Params: { id: string }; Body: any }>('/api/projects/:id', async (request) => {
        return ProjectService.getInstance().updateProject(request.params.id, request.body as any);
    });

    server.delete<{ Params: { id: string } }>('/api/projects/:id', async (request) => {
        return ProjectService.getInstance().deleteProject(request.params.id);
    });

    server.put<{ Body: { ids: string[] } }>('/api/projects/reorder', async (request, reply) => {
        try {
            return await ProjectService.getInstance().reorderProjects(request.body.ids);
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    server.get<{ Params: { id: string } }>('/api/projects/:id/details', async (request, reply) => {
        try {
            return await ProjectService.getInstance().getProjectDetails(request.params.id);
        } catch (error: any) {
            return reply.code(404).send({ error: error.message });
        }
    });

    server.post('/api/projects/scan', async () => {
        return ProjectService.getInstance().scanAndMergeProjects();
    });
}
