import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';

// Mock os.homedir
const { mockHomeDir } = vi.hoisted(() => ({
    mockHomeDir: '/mock/home',
}));

vi.mock('os', () => ({
    default: {
        homedir: () => mockHomeDir,
    },
    homedir: () => mockHomeDir,
}));

vi.mock('fs');

import fs from 'fs';
import { StatsService } from '../StatsService.js';

describe('StatsService', () => {
    let statsService: StatsService;
    const mockConfigDir = path.join(mockHomeDir, '.ai-cli-syncer');
    const mockStatsFile = path.join(mockConfigDir, 'stats.json');
    const mockActivityFile = path.join(mockConfigDir, 'activity.json');

    // Simple in-memory FS mock
    let mockFiles: Record<string, string> = {};

    beforeEach(() => {
        vi.clearAllMocks();
        mockFiles = {};

        // Setup fs mocks
        vi.mocked(fs.existsSync).mockImplementation((p: any) => {
            return p in mockFiles || p === mockConfigDir; // Assume dir exists for simplicity or mock mkdir
        });

        vi.mocked(fs.readFileSync).mockImplementation((p: any) => {
            if (p in mockFiles) return mockFiles[p];
            throw new Error('File not found');
        });

        vi.mocked(fs.writeFileSync).mockImplementation((p: any, data: any) => {
            mockFiles[p] = data.toString();
        });

        vi.mocked(fs.mkdirSync).mockImplementation(() => undefined);

        // Reset singleton instance if possible, or just rely on state reset via mocks
        // Since StatsService is a singleton, we can't easily reset it. 
        // But it reads from FS on every method call (except constructor), so mocking FS is enough.
        statsService = StatsService.getInstance();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should return default summary when file does not exist', () => {
        const summary = statsService.getSummary();
        expect(summary).toEqual({
            totalSyncs: 0,
            lastSync: null,
            successCount: 0,
            errorCount: 0,
            historyCount: 0
        });
    });

    it('should return summary from file', () => {
        const mockSummary = {
            totalSyncs: 10,
            lastSync: '2023-01-01T00:00:00.000Z',
            successCount: 8,
            errorCount: 2,
            historyCount: 10
        };
        mockFiles[mockStatsFile] = JSON.stringify(mockSummary);

        const summary = statsService.getSummary();
        expect(summary).toEqual(mockSummary);
    });

    it('should return empty activity feed when file does not exist', () => {
        const feed = statsService.getActivityFeed();
        expect(feed).toEqual([]);
    });

    it('should return activity feed from file', () => {
        const mockLogs = [
            { id: '1', timestamp: '2023-01-01', level: 'info', message: 'Log 1' }
        ];
        mockFiles[mockActivityFile] = JSON.stringify(mockLogs);

        const feed = statsService.getActivityFeed();
        expect(feed).toHaveLength(1);
        expect(feed[0].message).toBe('Log 1');
    });

    it('should record successful sync', async () => {
        await statsService.recordSync(true, 'Sync success');

        const summary = JSON.parse(mockFiles[mockStatsFile]);
        expect(summary.totalSyncs).toBe(1);
        expect(summary.successCount).toBe(1);
        expect(summary.errorCount).toBe(0);

        const logs = JSON.parse(mockFiles[mockActivityFile]);
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe('info');
        expect(logs[0].message).toBe('Sync success');
    });

    it('should record failed sync', async () => {
        await statsService.recordSync(false, 'Sync failed');

        const summary = JSON.parse(mockFiles[mockStatsFile]);
        expect(summary.totalSyncs).toBe(1);
        expect(summary.successCount).toBe(0);
        expect(summary.errorCount).toBe(1);

        const logs = JSON.parse(mockFiles[mockActivityFile]);
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe('error');
        expect(logs[0].message).toBe('Sync failed');
    });

    it('should add activity log', () => {
        statsService.addActivityLog('warn', 'Warning message');

        const logs = JSON.parse(mockFiles[mockActivityFile]);
        expect(logs).toHaveLength(1);
        expect(logs[0].level).toBe('warn');
        expect(logs[0].message).toBe('Warning message');
    });

    it('should limit activity logs', () => {
        // Create 1000 logs
        const manyLogs = Array(1000).fill(null).map((_, i) => ({
            id: i.toString(),
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `Log ${i}`
        }));
        mockFiles[mockActivityFile] = JSON.stringify(manyLogs);

        statsService.addActivityLog('info', 'New Log');

        const logs = JSON.parse(mockFiles[mockActivityFile]);
        expect(logs).toHaveLength(1000);
        expect(logs[0].message).toBe('New Log');
    });

    it('should handle corrupted stats file', () => {
        mockFiles[mockStatsFile] = 'invalid json';
        const summary = statsService.getSummary();
        expect(summary.totalSyncs).toBe(0);
    });

    it('should handle corrupted activity file', () => {
        mockFiles[mockActivityFile] = 'invalid json';
        const feed = statsService.getActivityFeed();
        expect(feed).toEqual([]);
    });
});
