import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ProjectInfo } from '../interfaces/ProjectInfo.js';
import { IProjectScannerStrategy } from './scanners/IProjectScannerStrategy.js';
import { IdeScannerStrategy } from './scanners/IdeScannerStrategy.js';
import { ClaudeScannerStrategy } from './scanners/ClaudeScannerStrategy.js';
import { GeminiScannerStrategy } from './scanners/GeminiScannerStrategy.js';

export type { ProjectInfo };

/**
 * 여러 전략을 사용하여 최근 프로젝트를 스캔하는 서비스.
 * Fallback 방식으로 IDE → Claude → Gemini 순으로 스캔을 시도한다.
 */
export class ProjectScanner {
    private strategies: IProjectScannerStrategy[] = [];

    constructor() {
        this.strategies = [
            new IdeScannerStrategy(),
            new ClaudeScannerStrategy(),
            new GeminiScannerStrategy(),
            // Add other strategies here as they are implemented
            // new CopilotScannerStrategy(),
        ];
    }

    /**
     * 모든 최근 프로젝트를 통합 스캔한다. (Fallback 방식)
     * 전략을 순차적으로 실행하며, 결과가 있는 경우 즉시 반환한다.
     * - 홈 디렉토리, 숨김 폴더 내 프로젝트, Git worktree는 제외
     * @returns 유효한 ProjectInfo 배열 (중복 제거됨)
     */
    async getAllRecentProjects(): Promise<ProjectInfo[]> {
        const homeDir = os.homedir();

        for (const strategy of this.strategies) {
            try {
                const projects = await strategy.scan();
                const validProjects: ProjectInfo[] = [];
                const seenPaths = new Set<string>();

                for (const project of projects) {
                    const normalizedPath = path.normalize(project.path);

                    // Filter: Exclude Home Directory
                    if (normalizedPath === homeDir) {
                        continue;
                    }

                    // Filter: Exclude Projects in Hidden Folders
                    const parts = normalizedPath.split(path.sep);
                    const hasHiddenSegment = parts.some(part =>
                        part.startsWith('.') &&
                        part !== '.' &&
                        part !== '..'
                    );

                    if (hasHiddenSegment) {
                        continue;
                    }

                    // Filter: Exclude Git Worktrees (where .git is a file)
                    try {
                        const gitPath = path.join(normalizedPath, '.git');
                        if (fs.existsSync(gitPath)) {
                            const stats = fs.statSync(gitPath);
                            if (stats.isFile()) {
                                continue;
                            }
                        }
                    } catch (e) {
                        // Ignore error, proceed
                    }

                    if (!seenPaths.has(normalizedPath)) {
                        seenPaths.add(normalizedPath);
                        validProjects.push({ ...project, path: normalizedPath });
                    }
                }

                // 전략이 유효한 프로젝트를 찾았으면 반환 (Fallback 성공)
                if (validProjects.length > 0) {
                    return validProjects;
                }
            } catch (error) {
                console.warn(`[ProjectScanner] Strategy ${strategy.name} failed:`, error);
                // 실패 시 다음 전략으로 계속 진행
            }
        }

        return [];
    }
}
