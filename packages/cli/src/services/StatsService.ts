import fs from 'fs';
import { getConfigDir } from '../constants/paths.js';
import path from 'path';
import os from 'os';

export interface StatsSummary {
    totalSyncs: number;
    lastSync: string | null;
    successCount: number;
    errorCount: number;
    historyCount: number;
}

export interface ActivityLog {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
}

export class StatsService {
    private static instance: StatsService;
    private configDir: string;
    private statsFile: string;
    private activityFile: string;

    private constructor() {
        this.configDir = getConfigDir();
        this.statsFile = path.join(this.configDir, 'stats.json');
        this.activityFile = path.join(this.configDir, 'activity.json');
        this.ensureConfigDir();
    }

    public static getInstance(): StatsService {
        if (!StatsService.instance) {
            StatsService.instance = new StatsService();
        }
        return StatsService.instance;
    }

    private ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    public getSummary(): StatsSummary {
        if (!fs.existsSync(this.statsFile)) {
            return {
                totalSyncs: 0,
                lastSync: null,
                successCount: 0,
                errorCount: 0,
                historyCount: 0
            };
        }
        try {
            return JSON.parse(fs.readFileSync(this.statsFile, 'utf-8'));
        } catch (error) {
            return {
                totalSyncs: 0,
                lastSync: null,
                successCount: 0,
                errorCount: 0,
                historyCount: 0
            };
        }
    }

    public getActivityFeed(limit: number = 50): ActivityLog[] {
        if (!fs.existsSync(this.activityFile)) {
            return [];
        }
        try {
            const logs: ActivityLog[] = JSON.parse(fs.readFileSync(this.activityFile, 'utf-8'));
            return logs.slice(0, limit);
        } catch (error) {
            return [];
        }
    }

    public async recordSync(success: boolean, message: string, context?: Record<string, unknown>) {
        const summary = this.getSummary();

        // Update summary
        summary.totalSyncs++;
        summary.lastSync = new Date().toISOString();
        if (success) {
            summary.successCount++;
        } else {
            summary.errorCount++;
        }
        // historyCount is updated separately or we can count activity logs
        summary.historyCount = summary.totalSyncs; // For now, sync count = history count

        fs.writeFileSync(this.statsFile, JSON.stringify(summary, null, 2));

        // Add activity log
        this.addActivityLog(success ? 'info' : 'error', message, context);
    }

    public addActivityLog(level: 'info' | 'warn' | 'error', message: string, context?: Record<string, unknown>) {
        let logs: ActivityLog[] = [];
        if (fs.existsSync(this.activityFile)) {
            try {
                logs = JSON.parse(fs.readFileSync(this.activityFile, 'utf-8'));
            } catch (error) {
                logs = [];
            }
        }

        const newLog: ActivityLog = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            level,
            message,
            context
        };

        logs.unshift(newLog);

        // Limit logs to 1000
        if (logs.length > 1000) {
            logs = logs.slice(0, 1000);
        }

        fs.writeFileSync(this.activityFile, JSON.stringify(logs, null, 2));
    }
}
