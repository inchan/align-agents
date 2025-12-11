import express from 'express';
import cors from 'cors';
import {
    initLogger,
    getLogger,
    expressLoggerMiddleware,
    expressErrorLogger,
} from '@align-agents/logger';
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

// Initialize structured logger for API
const apiLogger = initLogger({
    name: 'api',
    level: (process.env.LOG_LEVEL as any) ?? 'info',
    pretty: process.env.NODE_ENV !== 'production',
});

export function createApp() {
    const app = express();
    const logger = getLogger();

    // Initialize log interceptor
    LogInterceptor.init();

    app.use(cors());
    app.use(express.json());

    // Structured request logging middleware (루트 로거 공유)
    app.use(expressLoggerMiddleware({
        name: 'api',
        ignorePaths: ['/api/health', '/api/logs/stream'],
        useRootLogger: true,
    }));

    app.get('/api/health', (req, res) => {
        res.json({ status: 'ok' });
    });

    // Tools metadata endpoint (must be before /api/tools to avoid route conflict)
    app.get('/api/tools-metadata', async (req, res) => {
        try {
            const { TOOL_METADATA } = await import('@align-agents/cli');
            res.json(TOOL_METADATA);
        } catch (error) {
            logger.error({ error }, 'Error getting tool metadata');
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

    // Error logging middleware - must be after routes (루트 로거 공유)
    app.use(expressErrorLogger({ name: 'api', useRootLogger: true }));

    return app;
}

export const app = createApp();
