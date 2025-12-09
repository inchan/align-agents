import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectInfo } from '../../interfaces/ProjectInfo.js';
import { IProjectScannerStrategy } from './IProjectScannerStrategy.js';

export class ClaudeScannerStrategy implements IProjectScannerStrategy {
    name = 'Claude CLI';

    async scan(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        const homeDir = os.homedir();
        const claudeProjectsDir = path.join(homeDir, '.claude', 'projects');

        try {
            if (fs.existsSync(claudeProjectsDir)) {
                const entries = fs.readdirSync(claudeProjectsDir);

                for (const entry of entries) {
                    try {
                        // Claude projects are often stored as URL-encoded paths
                        const decodedPath = decodeURIComponent(entry);

                        // Check if it looks like a valid absolute path
                        if (path.isAbsolute(decodedPath) && fs.existsSync(decodedPath)) {
                            // Correctly identifies directory
                            const stats = fs.statSync(decodedPath);
                            if (stats.isDirectory()) {
                                projects.push({
                                    path: decodedPath,
                                    name: path.basename(decodedPath),
                                    source: 'claude',
                                });
                            }
                        }
                    } catch (e) {
                        // Ignore decoding errors
                    }
                }
            }
        } catch (error) {
            // Ignore if directory doesn't exist
        }

        return projects;
    }
}
