import express, { Request, Response } from 'express';
import { LoggerService } from '@ai-cli-syncer/cli';

const router = express.Router();

// Get log history
router.get('/history', (req: Request, res: Response) => {
    const logger = LoggerService.getInstance();
    res.json(logger.getHistory());
});

// SSE stream for real-time logs
router.get('/stream', (req: Request, res: Response) => {
    const logger = LoggerService.getInstance();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.flushHeaders();

    const listener = (entry: any) => {
        res.write(`data: ${JSON.stringify(entry)}\n\n`);
    };

    logger.on('log', listener);

    req.on('close', () => {
        logger.off('log', listener);
    });
});

export default router;
