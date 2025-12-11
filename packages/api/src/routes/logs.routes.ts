import express, { Request, Response } from 'express';
import { LoggerService } from '@align-agents/cli';

const router = express.Router();

// Get log history
router.get('/history', (req: Request, res: Response) => {
    const logger = LoggerService.getInstance();
    res.json(logger.getHistory());
});

// SSE stream for real-time logs
router.get('/stream', (req: Request, res: Response) => {
    const loggerService = LoggerService.getInstance();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.flushHeaders();

    const listener = (entry: any) => {
        try {
            if (!res.writableEnded) {
                res.write(`data: ${JSON.stringify(entry)}\n\n`);
            }
        } catch (error) {
            // 순환 참조 또는 연결 끊김 시 리스너 제거
            loggerService.off('log', listener);
        }
    };

    loggerService.on('log', listener);

    req.on('close', () => {
        loggerService.off('log', listener);
    });
});

export default router;
