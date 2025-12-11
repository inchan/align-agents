import { Request, Response } from 'express';
import { SyncHistoryRepository } from '@align-agents/cli/src/infrastructure/repositories/SyncHistoryRepository.js';

export class SyncHistoryController {
    constructor(private syncHistoryRepo: SyncHistoryRepository) {}

    /**
     * GET /api/sync-history
     * Get all sync history entries with optional filtering and pagination
     */
    async getAll(req: Request, res: Response) {
        try {
            const {
                limit = 50,
                offset = 0,
                target_type,
                tool_id,
                status
            } = req.query;

            const entries = this.syncHistoryRepo.findAll({
                limit: Number(limit),
                offset: Number(offset),
                target_type: target_type as string,
                tool_id: tool_id as string,
                status: status as string
            });

            const total = this.syncHistoryRepo.count({
                target_type: target_type as string,
                tool_id: tool_id as string,
                status: status as string
            });

            res.json({
                data: entries,
                pagination: {
                    total,
                    limit: Number(limit),
                    offset: Number(offset),
                    hasMore: Number(offset) + entries.length < total
                }
            });
        } catch (error: any) {
            console.error('Error fetching sync history:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/sync-history/:id
     * Get a specific sync history entry by ID
     */
    async getById(req: Request, res: Response) {
        try {
            const entry = this.syncHistoryRepo.findById(req.params.id);

            if (!entry) {
                return res.status(404).json({ error: 'History entry not found' });
            }

            // Parse details if it's JSON string
            if (entry.details) {
                try {
                    entry.details = JSON.parse(entry.details) as any;
                } catch {
                    // Keep as string if not valid JSON
                }
            }

            res.json(entry);
        } catch (error: any) {
            console.error('Error fetching sync history entry:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /api/sync-history/:id/retry
     * Retry a failed sync operation
     */
    async retry(req: Request, res: Response) {
        try {
            const entry = this.syncHistoryRepo.findById(req.params.id);

            if (!entry) {
                return res.status(404).json({ error: 'History entry not found' });
            }

            if (entry.status === 'success') {
                return res.status(400).json({ error: 'Cannot retry successful sync' });
            }

            // TODO: Implement retry logic by calling appropriate use case
            // This would require injecting the use cases into the controller
            // For now, return a placeholder response

            res.json({
                message: 'Retry functionality coming soon',
                historyId: entry.id,
                originalEntry: entry
            });
        } catch (error: any) {
            console.error('Error retrying sync:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/sync-history/stats
     * Get statistics about sync history
     */
    async getStats(req: Request, res: Response) {
        try {
            const stats = this.syncHistoryRepo.getStats();
            res.json(stats);
        } catch (error: any) {
            console.error('Error fetching sync history stats:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * DELETE /api/sync-history/cleanup
     * Clean up old sync history entries
     */
    async cleanup(req: Request, res: Response) {
        try {
            const { daysOld = 30 } = req.query;
            const deleted = this.syncHistoryRepo.deleteOlderThan(Number(daysOld));

            res.json({
                message: `Deleted ${deleted} entries older than ${daysOld} days`,
                deleted
            });
        } catch (error: any) {
            console.error('Error cleaning up sync history:', error);
            res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /api/sync-history/recent
     * Get recent sync history entries
     */
    async getRecent(req: Request, res: Response) {
        try {
            const { limit = 10 } = req.query;
            const entries = this.syncHistoryRepo.getRecent(Number(limit));
            res.json(entries);
        } catch (error: any) {
            console.error('Error fetching recent sync history:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
