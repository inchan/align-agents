import { Request, Response } from 'express';
import { historyService, syncService } from '../container.js';
import { LoggerService } from '@align-agents/cli';

export class StatsController {
    async getSummary(req: Request, res: Response) {
        try {
            const logger = LoggerService.getInstance();
            const history = historyService.getHistory();
            logger.log('info', `[StatsController] History length: ${history.length}`);
            if (history.length > 0) {
                logger.log('info', `[StatsController] First history item: ${JSON.stringify(history[0])}`);
            }
            const logs = logger.getHistory();

            const totalSyncs = history.length;
            const lastSync = history.length > 0 ? history[0].timestamp : null;

            // Calculate success rate based on logs (simple approximation)
            // Count 'Sync completed successfully' messages vs total sync start messages
            const successLogs = logs.filter(l => l.message.includes('Sync completed successfully')).length;
            const errorLogs = logs.filter(l => l.level === 'error').length;

            // This is a rough estimate as logs are in-memory and might be cleared
            // Ideally we should persist sync results in history

            res.json({
                totalSyncs,
                lastSync,
                successCount: successLogs,
                errorCount: errorLogs,
                historyCount: history.length,
                debug: {
                    historyLength: history.length,
                    firstHistory: history.length > 0 ? history[0] : null
                }
            });
        } catch (error: any) {
            console.error('Error getting stats summary:', error);
            const logger = LoggerService.getInstance();
            logger.log('error', `[StatsController] Error getting stats summary: ${error.message}\n${error.stack}`);
            res.status(500).json({ error: 'Failed to get stats summary', details: error.message });
        }
    }

    async getActivity(req: Request, res: Response) {
        try {
            const logger = LoggerService.getInstance();
            const logs = logger.getHistory();

            // Return last 50 logs
            const recentLogs = logs.slice(-50).reverse(); // Newest first

            res.json(recentLogs);
        } catch (error) {
            console.error('Error getting activity feed:', error);
            res.status(500).json({ error: 'Failed to get activity feed' });
        }
    }
}
