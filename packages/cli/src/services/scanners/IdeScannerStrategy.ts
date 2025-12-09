import fs from 'fs';
import path from 'path';
import os from 'os';
import { ProjectInfo } from '../../interfaces/ProjectInfo.js';
import { IProjectScannerStrategy } from './IProjectScannerStrategy.js';

export class IdeScannerStrategy implements IProjectScannerStrategy {
    name = 'IDE Storage';

    async scan(): Promise<ProjectInfo[]> {
        const projects: ProjectInfo[] = [];
        const homeDir = os.homedir();

        const storagePaths = [
            { path: path.join(homeDir, 'Library/Application Support/Code/User/globalStorage/storage.json'), source: 'vscode' as const },
            { path: path.join(homeDir, 'Library/Application Support/Cursor/User/globalStorage/storage.json'), source: 'cursor' as const },
            { path: path.join(homeDir, 'Library/Application Support/Windsurf/User/globalStorage/storage.json'), source: 'windsurf' as const },
        ];

        for (const { path: storagePath, source } of storagePaths) {
            try {
                if (fs.existsSync(storagePath)) {
                    const content = fs.readFileSync(storagePath, 'utf-8');
                    const data = JSON.parse(content);
                    const recentFolders = data.openedPathsList?.workspaces3 || [];

                    for (const folder of recentFolders) {
                        if (folder.folderUri) {
                            const folderPath = folder.folderUri.replace('file://', '');
                            if (fs.existsSync(folderPath)) {
                                projects.push({
                                    path: folderPath,
                                    name: path.basename(folderPath),
                                    source,
                                });
                            }
                        }
                    }
                }
            } catch (error) {
                // Ignore errors for individual IDEs
            }
        }

        return projects;
    }
}
