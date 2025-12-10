import express from 'express';
import cors from 'cors';
import toolsRoutes from './routes/tools.routes.js';
import rulesRoutes from './routes/rules.routes.js';
import mcpRoutes from './routes/mcp.routes.js';
import mcpsRoutes from './routes/mcps.routes.js';
import mcpSetsRoutes from './routes/mcp-sets.routes.js';
import configRoutes from './routes/config.routes.js';
import logsRoutes from './routes/logs.routes.js';
import statsRoutes from './routes/stats.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import { LogInterceptor } from '@align-agents/cli';

export function createApp() {
    const app = express();

    // Initialize log interceptor
    LogInterceptor.init();

    app.use(cors());
    app.use(express.json());

    // Request logging middleware
    app.use((req, res, next) => {
        const start = Date.now();
        const { method, path } = req;

        // Skip logging for SSE stream endpoint to avoid noise
        if (path === '/api/logs/stream') {
            return next();
        }

        res.on('finish', () => {
            const duration = Date.now() - start;
            const status = res.statusCode;
            const level = status >= 400 ? 'error' : status >= 300 ? 'warn' : 'info';
            console.log(`[API] ${method} ${path} ${status} ${duration}ms`);
        });

        next();
    });

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    // Tools metadata endpoint (must be before /api/tools to avoid route conflict)
    app.get('/api/tools-metadata', async (req, res) => {
        try {
            const { TOOL_METADATA } = await import('@align-agents/cli');
            res.json(TOOL_METADATA);
        } catch (error) {
            console.error('Error getting tool metadata:', error);
            res.status(500).json({ error: 'Failed to get tool metadata' });
        }
    });

    app.use('/api/tools', toolsRoutes);
    app.use('/api/rules', rulesRoutes);
    app.use('/api/mcp', mcpRoutes);
    app.use('/api/mcps', mcpsRoutes);
    app.use('/api/mcp-sets', mcpSetsRoutes);
    app.use('/api/config', configRoutes);
    app.use('/api/logs', logsRoutes);
    app.use('/api/stats', statsRoutes);
    app.use('/api/projects', projectsRoutes);

    return app;
}

export const app = createApp();
