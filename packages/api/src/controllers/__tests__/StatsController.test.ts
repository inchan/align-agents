import { describe, expect, it, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
    mockHistoryService: {
        getHistory: vi.fn(),
    },
    mockSyncService: {},
    mockLoggerService: {
        log: vi.fn(),
        getHistory: vi.fn(),
    },
}));

vi.mock('../../container.js', () => ({
    historyService: mocks.mockHistoryService,
    syncService: mocks.mockSyncService,
}));

vi.mock('@align-agents/cli', () => ({
    NodeFileSystem: class {},
    RulesService: class {},
    SyncService: class {},
    HistoryService: class {},
    McpService: class {},
    LoggerService: {
        getInstance: () => mocks.mockLoggerService,
    },
}));

import { StatsController } from '../StatsController.js';

function createRes() {
    const res: any = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.body = payload;
            return this;
        },
    };
    return res;
}

describe('StatsController', () => {
    let controller: StatsController;

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new StatsController();
    });

    describe('getSummary', () => {
        it('returns empty stats when no history', async () => {
            mocks.mockHistoryService.getHistory.mockReturnValue([]);
            mocks.mockLoggerService.getHistory.mockReturnValue([]);

            const res = createRes();
            await controller.getSummary({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.totalSyncs).toBe(0);
            expect(res.body.lastSync).toBeNull();
            expect(res.body.successCount).toBe(0);
            expect(res.body.errorCount).toBe(0);
        });

        it('returns stats with history', async () => {
            const timestamp = new Date().toISOString();
            mocks.mockHistoryService.getHistory.mockReturnValue([
                { timestamp, type: 'sync', target: 'claude-code' },
                { timestamp: new Date(Date.now() - 1000).toISOString(), type: 'sync', target: 'gemini' },
            ]);
            mocks.mockLoggerService.getHistory.mockReturnValue([
                { level: 'info', message: 'Sync completed successfully' },
                { level: 'info', message: 'Sync completed successfully' },
                { level: 'error', message: 'Sync failed' },
            ]);

            const res = createRes();
            await controller.getSummary({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.totalSyncs).toBe(2);
            expect(res.body.lastSync).toBe(timestamp);
            expect(res.body.successCount).toBe(2);
            expect(res.body.errorCount).toBe(1);
            expect(res.body.historyCount).toBe(2);
        });

        it('includes debug info', async () => {
            const timestamp = new Date().toISOString();
            const history = [{ timestamp, type: 'sync' }];
            mocks.mockHistoryService.getHistory.mockReturnValue(history);
            mocks.mockLoggerService.getHistory.mockReturnValue([]);

            const res = createRes();
            await controller.getSummary({} as any, res);

            expect(res.body.debug).toBeDefined();
            expect(res.body.debug.historyLength).toBe(1);
            expect(res.body.debug.firstHistory).toEqual(history[0]);
        });

        it('returns 500 on error', async () => {
            mocks.mockHistoryService.getHistory.mockImplementation(() => {
                throw new Error('Database error');
            });

            const res = createRes();
            await controller.getSummary({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get stats summary');
            expect(res.body.details).toBe('Database error');
        });
    });

    describe('getActivity', () => {
        it('returns empty array when no logs', async () => {
            mocks.mockLoggerService.getHistory.mockReturnValue([]);

            const res = createRes();
            await controller.getActivity({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('returns last 50 logs in reverse order (newest first)', async () => {
            const logs = Array.from({ length: 100 }, (_, i) => ({
                level: 'info',
                message: `Log ${i}`,
                timestamp: new Date(Date.now() + i * 1000).toISOString(),
            }));
            mocks.mockLoggerService.getHistory.mockReturnValue(logs);

            const res = createRes();
            await controller.getActivity({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(50);
            // First item should be the newest (last item from original array, reversed)
            expect(res.body[0].message).toBe('Log 99');
            expect(res.body[49].message).toBe('Log 50');
        });

        it('returns all logs if less than 50', async () => {
            const logs = Array.from({ length: 10 }, (_, i) => ({
                level: 'info',
                message: `Log ${i}`,
            }));
            mocks.mockLoggerService.getHistory.mockReturnValue(logs);

            const res = createRes();
            await controller.getActivity({} as any, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.length).toBe(10);
        });

        it('returns 500 on error', async () => {
            mocks.mockLoggerService.getHistory.mockImplementation(() => {
                throw new Error('Logger error');
            });

            const res = createRes();
            await controller.getActivity({} as any, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toBe('Failed to get activity feed');
        });
    });
});
