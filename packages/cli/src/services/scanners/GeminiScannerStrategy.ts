import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectInfo } from '../../interfaces/ProjectInfo.js';
import { IProjectScannerStrategy } from './IProjectScannerStrategy.js';

export class GeminiScannerStrategy implements IProjectScannerStrategy {
    name = 'Gemini CLI';

    async scan(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        const homeDir = os.homedir();
        const trustedFoldersPath = path.join(homeDir, '.gemini', 'trustedFolders.json');

        try {
            if (fs.existsSync(trustedFoldersPath)) {
                const content = fs.readFileSync(trustedFoldersPath, 'utf-8');
                const data = JSON.parse(content);

                // User hint: "TRUST_FOLDER로 되어잇는게 프로젝트 폴더인거같아"
                // Possible structure 1: { "/path/to/proj": "TRUST_FOLDER", ... }
                // Possible structure 2: { "trustedFolders": ["/path/to/proj", ...] }

                // Handling Structure 1 (Map)
                if (typeof data === 'object' && !Array.isArray(data)) {
                    for (const [folderPath, status] of Object.entries(data)) {
                        if (status === 'TRUST_FOLDER' || status === true) { // Robust check
                            if (path.isAbsolute(folderPath) && fs.existsSync(folderPath)) {
                                projects.push({
                                    path: folderPath,
                                    name: path.basename(folderPath),
                                    source: 'gemini',
                                });
                            }
                        }
                    }
                }

                // Handling Structure 2 (Array - just in case)
                if (Array.isArray(data)) {
                    for (const folderPath of data) {
                        if (typeof folderPath === 'string' && fs.existsSync(folderPath)) {
                            projects.push({
                                path: folderPath,
                                name: path.basename(folderPath),
                                source: 'gemini',
                            });
                        }
                    }
                }
            }
        } catch (error) {
            // Ignore errors
        }

        return projects;
    }
}
