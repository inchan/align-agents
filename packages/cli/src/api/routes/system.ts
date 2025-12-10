import { FastifyInstance } from 'fastify';
import { LoggerService } from '../../services/LoggerService.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function systemRoutes(server: FastifyInstance) {
    server.get('/api/logs/history', async (request, reply) => {
        return LoggerService.getInstance().getHistory();
    });

    server.get('/api/health', async (request, reply) => {
        return { status: 'ok', uptime: process.uptime() };
    });

    server.get('/api/stats/summary', async (request, reply) => {
        const { StatsService } = await import('../../services/StatsService.js');
        return StatsService.getInstance().getSummary();
    });

    server.get('/api/stats/activity', async (request, reply) => {
        const { StatsService } = await import('../../services/StatsService.js');
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
}
