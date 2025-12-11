import fs from 'fs';
import { getConfigDir } from '../constants/paths.js';
import path from 'path';
import os from 'os';

/** 동기화 통계 요약 인터페이스 */
export interface StatsSummary {
    totalSyncs: number;
    lastSync: string | null;
    successCount: number;
    errorCount: number;
    historyCount: number;
}

/** 활동 로그 항목 인터페이스 */
export interface ActivityLog {
    id: string;
    timestamp: string;
    level: 'info' | 'warn' | 'error';
    message: string;
    context?: Record<string, unknown>;
}

/**
 * 동기화 통계 및 활동 로그 관리 서비스 (싱글톤)
 * JSON 파일에 통계와 활동 로그를 영속화한다.
 */
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

    /** 설정 디렉토리가 없으면 생성한다. */
    private ensureConfigDir() {
        if (!fs.existsSync(this.configDir)) {
            fs.mkdirSync(this.configDir, { recursive: true });
        }
    }

    /**
     * 동기화 통계 요약을 조회한다.
     * @returns StatsSummary 객체
     */
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

    /**
     * 활동 로그를 조회한다.
     * @param limit - 반환할 최대 로그 수 (기본: 50)
     * @returns ActivityLog 배열
     */
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

    /**
     * 동기화 결과를 기록한다.
     * 통계를 업데이트하고 활동 로그에 추가한다.
     * @param success - 성공 여부
     * @param message - 로그 메시지
     * @param context - 추가 컨텍스트 정보
     */
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

    /**
     * 활동 로그를 추가한다. 최대 1000개까지 보관한다.
     * @param level - 로그 레벨
     * @param message - 로그 메시지
     * @param context - 추가 컨텍스트 정보
     */
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
