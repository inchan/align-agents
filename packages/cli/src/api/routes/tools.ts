import { FastifyInstance } from 'fastify';
import { ToolRepository } from '../../repositories/ToolRepository.js';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = util.promisify(exec);

export async function toolRoutes(server: FastifyInstance) {
    server.get('/api/tools', async (request, reply) => {
        const repo = ToolRepository.getInstance();
        await repo.load();
        const tools = repo.getTools();
        return { tools };
    });

    server.put<{ Params: { id: string }; Body: any }>('/api/tools/:id', async (request, reply) => {
        const { id } = request.params;
        const updates = request.body;
        try {
            const updatedTool = await ToolRepository.getInstance().updateTool(id, updates as any);
            return updatedTool;
        } catch (error: any) {
            return reply.code(404).send({ error: error.message });
        }
    });

    server.delete<{ Params: { id: string } }>('/api/tools/:id', async (request, reply) => {
        const { id } = request.params;
        const success = await ToolRepository.getInstance().removeTool(id);
        if (!success) {
            return reply.code(404).send({ error: 'Tool not found' });
        }
        return { success: true };
    });

    server.post('/api/tools/pick-folder', async (request, reply) => {
        if (process.platform === 'darwin') {
            try {
                const { stdout } = await execAsync(`osascript -e 'POSIX path of (choose folder with prompt "Select a folder")'`);
                return { path: stdout.trim() };
            } catch (error: any) {
                const errorStr = error.stderr || error.message || '';
                if (errorStr.includes('User canceled') || errorStr.includes('cancelled')) {
                    return { path: null, cancelled: true };
                }
                server.log.error(error);
                return reply.code(500).send({ error: 'Failed to open folder picker' });
            }
        } else {
            return reply.code(501).send({ error: 'Folder picker is only supported on macOS currently' });
        }
    });

    server.post<{ Params: { id: string } }>('/api/tools/:id/check-help', async (request, reply) => {
        const { id } = request.params;
        try {
            const { stdout } = await execAsync(`${id} --help`);
            return { output: stdout };
        } catch (error: any) {
            return { output: error.message };
        }
    });

    server.get('/api/tools/recent-projects', async (request, reply) => {
        const { ProjectScanner } = await import('../../services/ProjectScanner.js');
        const scanner = new ProjectScanner();
        try {
            const projects = await scanner.getAllRecentProjects();
            return projects;
        } catch (error: any) {
            server.log.error(error);
            return reply.code(500).send({ error: error.message });
        }
    });

    server.post<{ Body: { name: string; configPath: string; description?: string; format?: string; rulesPath?: string; mcpPath?: string } }>('/api/tools', async (request, reply) => {
        const { name, configPath, description, format, rulesPath, mcpPath } = request.body;

        if (!name || !configPath) {
            return reply.code(400).send({ error: 'Name and config path are required' });
        }

        const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

        try {
            const repo = ToolRepository.getInstance();
            if (repo.getTool(id)) {
                return reply.code(409).send({ error: 'Tool with this name already exists' });
            }

            const newTool = {
                id,
                name,
                configPath,
                description: description || '',
                format: (format || 'json') as any,
                exists: fs.existsSync(configPath),
                rulesPath: rulesPath || '',
                mcpPath: mcpPath || '',
                addedAt: new Date().toISOString()
            };

            await repo.addTool(newTool);
            return { success: true, tool: newTool };
        } catch (error: any) {
            return reply.code(500).send({ error: error.message });
        }
    });

    server.get('/api/tools-metadata', async () => {
        const { TOOL_METADATA } = await import('../../constants/tools.js');
        return TOOL_METADATA;
    });

    server.get<{ Querystring: { path: string } }>('/api/config', async (request, reply) => {
        const configPath = request.query.path;
        if (!configPath) {
            return reply.code(400).send({ error: 'Path is required' });
        }

        const repo = ToolRepository.getInstance();
        await repo.load();
        const tools = repo.getTools();
        const tool = tools.find(t => t.configPath === configPath);

        if (!tool) {
            return reply.code(403).send({ error: 'Access denied: Path not in registry' });
        }

        if (!fs.existsSync(configPath)) {
            return reply.code(404).send({ error: 'File not found' });
        }

        const content = fs.readFileSync(configPath, 'utf-8');
        return { content };
    });

    server.post<{ Body: { path: string; content: string } }>('/api/config', async (request, reply) => {
        const { path: configPath, content } = request.body;

        if (!configPath || content === undefined) {
            return reply.code(400).send({ error: 'Path and content are required' });
        }

        const repo = ToolRepository.getInstance();
        await repo.load();
        const tools = repo.getTools();
        const tool = tools.find(t => t.configPath === configPath);

        if (!tool) {
            return reply.code(403).send({ error: 'Access denied: Path not in registry' });
        }

        if (fs.existsSync(configPath)) {
            const backupPath = `${configPath}.bak`;
            fs.copyFileSync(configPath, backupPath);
        }

        fs.writeFileSync(configPath, content, 'utf-8');
        return { success: true };
    });

    server.post('/api/tools/scan', async () => {
        const { scanForTools, saveRegistry } = await import('../../services/scanner.js');
        const tools = await scanForTools();
        saveRegistry(tools);
        const repo = ToolRepository.getInstance();
        await repo.load();
        return { tools: repo.getTools() };
    });
}
