import { Command } from 'commander';
import Fastify from 'fastify';
import { FastifyInstance } from 'fastify';
import { LoggerService } from '../services/LoggerService.js';
import { LogInterceptor } from '../infrastructure/LogInterceptor.js';
import fastifyStatic from '@fastify/static';
import fastifyCors from '@fastify/cors';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import open from 'open';
import chalk from 'chalk';
import { ProjectService } from '../services/ProjectService.js';
import { ToolRepository } from '../repositories/ToolRepository.js';
import { exec } from 'child_process';
import util from 'util';
const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uiCommand = new Command('ui')
    .description('Start the local Web UI')
    .option('-p, --port <number>', 'Port to run the server on', '3001')
    .option('--no-open', 'Do not open browser on start')
    .action(async (options) => {
        const port = parseInt(options.port, 10);
        const server = Fastify({ logger: true });

        await server.register(fastifyCors, {
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        });

        // API Endpoints
        server.get('/api/tools', async (request, reply) => {
            const repo = ToolRepository.getInstance();
            await repo.load();
            const tools = repo.getTools();
            // registry.json structure has tools array and lastScan
            // we'll explicitly construct the response similar to old format if needed,
            // or just return tools array if that matches api.ts fetchTools expectation.
            // fetchTools in api.ts handles {tools: []} or [].
            // Old code returned parsed json which likely had { tools: [], lastScan: ... }
            // Let's stick to returning the full object structure if possible or just tools.
            // ToolRepository doesn't expose lastScan in getTools().
            // Let's modify ToolRepository to expose getRegistry() if needed, or just return { tools }
            return { tools };
        });

        // Tools Enhancement API
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
                    // Use osascript to open native folder picker dialog
                    // Note: We don't try to activate the current process since Node.js is not a GUI app
                    const { stdout } = await execAsync(`osascript -e 'POSIX path of (choose folder with prompt "Select a folder")'`);
                    return { path: stdout.trim() };
                } catch (error: any) {
                    // User cancelled - check various error message patterns
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
            // This is for CLI tools. We assume the command name is the tool ID or we need a way to know the binary name.
            // For now, let's assume the tool ID matches the command, or we look it up.
            // Actually, for custom tools, we might need a 'command' field. 
            // But usually 'tools' here are config based.
            // If the user wants to check options for a CLI tool, they should probably provide the command.
            // Let's rely on the body commands.

            // Wait, the requirement says "cli의 경우 --help를 확인".
            // We can try running `${id} --help` or use a provided command.

            try {
                const { stdout } = await execAsync(`${id} --help`);
                return { output: stdout };
            } catch (error: any) {
                return { output: error.message }; // Return error as output to show user
            }
        });

        server.get('/api/tools/recent-projects', async (request, reply) => {
            const { ProjectScanner } = await import('../services/ProjectScanner.js');
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

            // Generate ID from name
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
                    // Cast format to specific union type if needed, or string
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
            const { TOOL_METADATA } = await import('../constants/tools.js');
            return TOOL_METADATA;
        });

        server.get<{ Querystring: { path: string } }>('/api/config', async (request, reply) => {
            const configPath = request.query.path;
            if (!configPath) {
                return reply.code(400).send({ error: 'Path is required' });
            }

            // Security: Verify path exists in registry
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

            // Security: Verify path exists in registry
            const repo = ToolRepository.getInstance();
            await repo.load();
            const tools = repo.getTools();
            const tool = tools.find(t => t.configPath === configPath);

            if (!tool) {
                return reply.code(403).send({ error: 'Access denied: Path not in registry' });
            }

            // Backup
            if (fs.existsSync(configPath)) {
                const backupPath = `${configPath}.bak`;
                fs.copyFileSync(configPath, backupPath);
            }

            fs.writeFileSync(configPath, content, 'utf-8');
            return { success: true };
        });

        // Master MCP API
        server.get('/api/mcp/master', async (request, reply) => {
            const { loadMasterMcp } = await import('../services/sync.js');
            return loadMasterMcp();
        });

        server.post<{ Body: { mcpServers: Record<string, any> } }>('/api/mcp/master', async (request, reply) => {
            const { saveMasterMcp } = await import('../services/sync.js');
            try {
                await saveMasterMcp(request.body as any);
                return { success: true };
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        });

        // Sync Config API
        server.get('/api/sync-config', async (request, reply) => {
            const { loadSyncConfig } = await import('../services/sync.js');
            return loadSyncConfig();
        });

        server.post<{ Body: Record<string, any> }>('/api/sync-config', async (request, reply) => {
            const { saveSyncConfig } = await import('../services/sync.js');
            try {
                saveSyncConfig(request.body as any);
                return { success: true };
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        });

        // Sync Execution API
        server.post<{ Body: { toolId?: string; all?: boolean; sourceId?: string } }>('/api/mcp/sync', async (request, reply) => {
            const { syncToolMcp, syncAllTools } = await import('../services/sync.js');
            const { toolId, all, sourceId } = request.body;

            try {
                if (all) {
                    if (!sourceId) {
                        return reply.code(400).send({ error: 'Source ID (MCP Set ID) is required for sync' });
                    }
                    const results = await syncAllTools(sourceId);
                    const success = results.every(r => r.status === 'success' || r.status === 'skipped');
                    const { StatsService } = await import('../services/StatsService.js');
                    await StatsService.getInstance().recordSync(success, success ? 'All tools synced successfully' : 'Some tools failed to sync', { results });
                    return { success: true, message: 'All tools synced', results };
                } else if (toolId) {
                    // toolId sync also requires sourceId now for stateless, unless we want to allow legacy?
                    // SyncService.syncToolMcp requires sourceId to fetch set.
                    if (!sourceId) {
                        return reply.code(400).send({ error: 'Source ID (MCP Set ID) is required for sync' });
                    }

                    const repo = ToolRepository.getInstance();
                    await repo.load();
                    const tool = repo.getTool(toolId);
                    if (!tool) {
                        return reply.code(404).send({ error: 'Tool not found' });
                    }
                    const { getToolMetadata } = await import('../constants/tools.js');
                    const meta = getToolMetadata(toolId);
                    if (meta?.format === 'toml') {
                        return reply.code(400).send({ error: 'TOML 포맷 도구는 기본적으로 동기화 대상이 아닙니다.' });
                    }
                    const { loadSyncConfig } = await import('../services/sync.js');
                    const syncConfig = loadSyncConfig();
                    const toolSyncConfig = syncConfig[toolId];
                    if (!toolSyncConfig) {
                        return reply.code(400).send({ error: 'Tool sync config not found' });
                    }
                    // Pass sourceId
                    const servers = await syncToolMcp(toolId, tool.configPath, toolSyncConfig.servers, 'overwrite', undefined, sourceId);

                    const { StatsService } = await import('../services/StatsService.js');
                    await StatsService.getInstance().recordSync(true, `Tool ${toolId} synced successfully`, { toolId, servers });

                    return { success: true, message: `Tool ${toolId} synced` };
                } else {
                    return reply.code(400).send({ error: 'Either toolId or all must be specified' });
                }
            } catch (error: any) {
                const { StatsService } = await import('../services/StatsService.js');
                await StatsService.getInstance().recordSync(false, `Sync failed: ${error.message}`, { error: error.message });

                const status = error?.message?.includes('Unknown tool') ? 400 : 500;
                return reply.code(status).send({ error: error.message });
            }
        });

        // Global Config API
        server.get('/api/global-config', async (request, reply) => {
            const { getGlobalConfig } = await import('../services/sync.js');
            return getGlobalConfig();
        });

        server.post<{ Body: Record<string, any> }>('/api/global-config', async (request, reply) => {
            const { saveGlobalConfig } = await import('../services/sync.js');
            try {
                saveGlobalConfig(request.body as any);
                return { success: true };
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        });

        // Master Rules API
        server.get('/api/rules/master', async (request, reply) => {
            const { loadMasterRules } = await import('../services/rules.js');
            const content = loadMasterRules();
            return { content };
        });

        server.post<{ Body: { content: string } }>('/api/rules/master', async (request, reply) => {
            const { saveMasterRules } = await import('../services/rules.js');
            try {
                await saveMasterRules(request.body.content);
                return { success: true };
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        });

        // Rules Config API
        server.get('/api/rules-config', async (request, reply) => {
            const { loadRulesConfig } = await import('../services/rules.js');
            return loadRulesConfig();
        });

        server.post<{ Body: any }>('/api/rules-config', async (request, reply) => {
            const { saveRulesConfig } = await import('../services/rules.js');
            try {
                saveRulesConfig(request.body as any);
                return { success: true };
            } catch (error: any) {
                return reply.code(400).send({ error: error.message });
            }
        });

        // Rules Sync API
        server.post<{ Body: { toolId?: string; projectPath?: string; all?: boolean; global?: boolean; sourceId?: string } }>('/api/rules/sync', async (request, reply) => {
            const { syncToolRules, syncAllToolsRules } = await import('../services/rules.js');
            const { toolId, projectPath, all, global, sourceId } = request.body;

            try {
                const { StatsService } = await import('../services/StatsService.js');
                if (all) {
                    if (!projectPath) {
                        return reply.code(400).send({ error: 'Project path is required for sync all' });
                    }
                    if (!sourceId) {
                        return reply.code(400).send({ error: 'Source ID is required for sync' });
                    }
                    const results = await syncAllToolsRules(projectPath, 'overwrite', sourceId);
                    const success = results.every(r => r.status === 'success' || r.status === 'skipped');
                    await StatsService.getInstance().recordSync(success, success ? 'All rules synced successfully' : 'Some rules failed to sync', { results, type: 'rules' });
                    return { success: true, message: 'All tools synced', results };
                } else if (toolId) {
                    if (!sourceId) {
                        return reply.code(400).send({ error: 'Source ID is required for sync' });
                    }
                    await syncToolRules(toolId, projectPath || '', global !== undefined ? global : true, 'smart-update', undefined, sourceId);
                    await StatsService.getInstance().recordSync(true, `Rules for ${toolId} synced successfully`, { toolId, type: 'rules' });
                    return { success: true, message: `Tool ${toolId} synced` };
                } else {
                    return reply.code(400).send({ error: 'Either toolId or all must be specified' });
                }
            } catch (error: any) {
                console.error(error);
                const { StatsService } = await import('../services/StatsService.js');
                await StatsService.getInstance().recordSync(false, `Rules sync failed: ${error.message}`, { error: error.message, type: 'rules' });
                return reply.code(500).send({ error: error.message });
            }
        });

        // Multi-Rules Management API
        server.get('/api/rules', async (request, reply) => {
            const { fetchRulesList } = await import('../services/rules-multi.js');
            try {
                return fetchRulesList();
            } catch (error: any) {
                return reply.code(500).send({ error: error.message });
            }
        });

        server.post<{ Body: { name: string; content: string } }>('/api/rules', async (request, reply) => {
            const { createRule } = await import('../services/rules-multi.js');
            const { name, content } = request.body;

            if (!name || !name.trim()) {
                return reply.code(400).send({ error: 'Rule name is required' });
            }

            try {
                return createRule(name, content || '');
            } catch (error: any) {
                return reply.code(500).send({ error: error.message });
            }
        });

        server.put<{ Params: { id: string }; Body: { content: string; name?: string } }>('/api/rules/:id', async (request, reply) => {
            const { updateRule } = await import('../services/rules-multi.js');
            const { id } = request.params;
            const { content, name } = request.body;

            try {
                return updateRule(id, content, name);
            } catch (error: any) {
                const status = error.message.includes('not found') ? 404 : 500;
                return reply.code(status).send({ error: error.message });
            }
        });

        server.delete<{ Params: { id: string } }>('/api/rules/:id', async (request, reply) => {
            const { deleteRule } = await import('../services/rules-multi.js');
            const { id } = request.params;

            try {
                deleteRule(id);
                return { success: true };
            } catch (error: any) {
                const status = error.message.includes('not found') ? 404 : 500;
                return reply.code(status).send({ error: error.message });
            }
        });

        server.put<{ Params: { id: string } }>('/api/rules/:id/activate', async (request, reply) => {
            const { setActiveRule } = await import('../services/rules-multi.js');
            const { id } = request.params;

            try {
                setActiveRule(id);
                return { success: true };
            } catch (error: any) {
                const status = error.message.includes('not found') ? 404 : 500;
                return reply.code(status).send({ error: error.message });
            }
        });

        // MCP Pool API
        server.get('/api/mcps', async () => {
            const { fetchMcpPool } = await import('../services/mcp-multi.js');
            return fetchMcpPool();
        });

        server.post<{ Body: any }>('/api/mcps', async (request) => {
            const { createMcpDef } = await import('../services/mcp-multi.js');
            return createMcpDef(request.body as any);
        });

        server.put<{ Params: { id: string }; Body: any }>('/api/mcps/:id', async (request) => {
            const { updateMcpDef } = await import('../services/mcp-multi.js');
            return updateMcpDef(request.params.id, request.body as any);
        });

        server.delete<{ Params: { id: string } }>('/api/mcps/:id', async (request) => {
            const { deleteMcpDef } = await import('../services/mcp-multi.js');
            return deleteMcpDef(request.params.id);
        });

        // MCP Sets API
        server.get('/api/mcp-sets', async () => {
            const { fetchMcpSets } = await import('../services/mcp-multi.js');
            return fetchMcpSets();
        });

        server.post<{ Body: { name: string; description?: string; items?: any } }>('/api/mcp-sets', async (request) => {
            const { createMcpSet } = await import('../services/mcp-multi.js');
            console.log('[API] POST /mcp-sets body:', request.body);
            return createMcpSet(request.body.name, request.body.items, request.body.description);
        });

        server.put<{ Params: { id: string }; Body: { name?: string; description?: string; items?: any } }>('/api/mcp-sets/:id', async (request) => {
            const { updateMcpSet } = await import('../services/mcp-multi.js');
            return updateMcpSet(request.params.id, request.body);
        });

        server.delete<{ Params: { id: string } }>('/api/mcp-sets/:id', async (request) => {
            const { deleteMcpSet } = await import('../services/mcp-multi.js');
            return deleteMcpSet(request.params.id);
        });

        server.put<{ Params: { id: string } }>('/api/mcp-sets/:id/activate', async (request) => {
            const { setActiveMcpSet } = await import('../services/mcp-multi.js');
            return setActiveMcpSet(request.params.id);
        });

        // Projects API
        server.get('/api/projects', async () => {
            return ProjectService.getInstance().getProjects();
        });

        server.post<{ Body: any }>('/api/projects', async (request, reply) => {
            console.log('[API] Creating project with body:', request.body);
            // Log to file for debugging since we can't see the console
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

                // Return detailed error to client
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
        // Logs API
        server.get('/api/logs/history', async (request, reply) => {
            return LoggerService.getInstance().getHistory();
        });

        // Health Check
        server.get('/api/health', async (request, reply) => {
            return { status: 'ok', uptime: process.uptime() };
        });

        // Stats API
        server.get('/api/stats/summary', async (request, reply) => {
            const { StatsService } = await import('../services/StatsService.js');
            return StatsService.getInstance().getSummary();
        });

        server.get('/api/stats/activity', async (request, reply) => {
            const { StatsService } = await import('../services/StatsService.js');
            return StatsService.getInstance().getActivityFeed();
        });

        server.get('/api/logs/stream', (request, reply) => {
            const logger = LoggerService.getInstance();
            reply.raw.writeHead(200, {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            });

            const listener = (entry: any) => {
                reply.raw.write(`data: ${JSON.stringify(entry)}\n\n`);
            };

            logger.on('log', listener);

            request.raw.on('close', () => {
                logger.off('log', listener);
            });
        });



        // Serve static files from the web package's dist directory
        // Assuming the CLI is run from packages/cli and web is built to packages/web/dist
        // We need to resolve the path correctly relative to the built CLI code
        const webDistPath = path.resolve(__dirname, '../../../web/dist');

        server.register(fastifyStatic, {
            root: webDistPath,
            prefix: '/',
        });

        server.setNotFoundHandler((request, reply) => {
            // API 경로는 기존 404 처리 유지
            if (request.raw.url && request.raw.url.startsWith('/api')) {
                return reply.code(404).send({ error: 'Not Found' });
            }

            const indexPath = path.join(webDistPath, 'index.html');
            if (fs.existsSync(indexPath)) {
                reply.type('text/html').send(fs.readFileSync(indexPath));
            } else {
                reply.code(404).send({ error: 'UI build not found' });
            }
        });

        try {
            await server.listen({ port });
            const url = `http://localhost:${port}`;
            console.log(chalk.green(`\n🚀 AI CLI Syncer UI running at: ${chalk.bold(url)}\n`));
            if (options.open) {
                await open(url);
            }
        } catch (err) {
            server.log.error(err);
            process.exit(1);
        }
    });

