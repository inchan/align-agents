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
import { RulesService } from '../services/impl/RulesService.js';
import { McpService } from '../services/impl/McpService.js';
import { SyncService } from '../services/impl/SyncService.js';
import { NodeFileSystem } from '../infrastructure/NodeFileSystem.js';

const execAsync = util.promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const uiCommand = new Command('ui')
    .description('Start the local Web UI')
    .option('-p, --port <number>', 'Port to run the server on', '3001')
    .option('--no-open', 'Do not open browser on start')
    .action(async (options) => {
        const port = parseInt(options.port, 10);
        const server = Fastify({ logger: false });

        // Initialize Services
        const fileSystem = new NodeFileSystem();
        const rulesService = new RulesService(fileSystem);
        const mcpService = new McpService();
        const syncService = new SyncService(fileSystem);

        // Custom Logger Hook
        server.addHook('onResponse', (request, reply, done) => {
            // Skip health check success logs entirely
            if (request.url === '/api/health' && reply.statusCode === 200) {
                done();
                return;
            }

            const method = request.method;
            const url = request.url;
            const statusCode = reply.statusCode;
            const duration = reply.elapsedTime;

            let statusColor = chalk.green;
            if (statusCode >= 500) statusColor = chalk.red;
            else if (statusCode >= 400) statusColor = chalk.yellow;

            const methodColor = method === 'GET' ? chalk.blue :
                method === 'POST' ? chalk.green :
                    method === 'PUT' ? chalk.yellow :
                        method === 'DELETE' ? chalk.red : chalk.white;

            console.log(
                `${chalk.gray('[API]')} ${methodColor(method)} ${url} ${statusColor(statusCode)} ${chalk.gray(duration.toFixed(1) + 'ms')}`
            );
            done();
        });

        await server.register(fastifyCors, {
            origin: true,
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization'],
            credentials: true
        });

        // Register Routes
        const { toolRoutes } = await import('../api/routes/tools.js');
        const { projectRoutes } = await import('../api/routes/projects.js');
        const { syncRoutes } = await import('../api/routes/sync.js');
        const { rulesRoutes } = await import('../api/routes/rules.js');
        const { mcpRoutes } = await import('../api/routes/mcp.js');
        const { systemRoutes } = await import('../api/routes/system.js');

        await server.register(toolRoutes);
        await server.register(projectRoutes);
        await server.register(async (instance) => syncRoutes(instance, syncService));
        await server.register(async (instance) => rulesRoutes(instance, rulesService));
        await server.register(async (instance) => mcpRoutes(instance, mcpService));
        await server.register(systemRoutes);

        if (process.env.NODE_ENV === 'test' || process.env.E2E_TEST_MODE === 'true') {
            const { testRoutes } = await import('../api/routes/test.js');
            await server.register(testRoutes);
            console.log(chalk.yellow('⚠️  Test routes registered (E2E_TEST_MODE Active)'));
        }

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

