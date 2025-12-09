import { IHistoryService, HistoryEntry, HistoryType } from '../../interfaces/IHistoryService.js';
import { IFileSystem } from '../../interfaces/IFileSystem.js';
import path from 'path';
import { getConfigDir } from '../../constants/paths.js';

export class HistoryService implements IHistoryService {
    constructor(private fs: IFileSystem) { }

    private getHistoryDir(): string {
        return this.fs.join(getConfigDir(), 'history');
    }

    private getHistoryIndexFile(): string {
        return this.fs.join(this.getHistoryDir(), 'index.json');
    }

    saveVersion(type: HistoryType, content: string, description?: string): string {
        const historyDir = this.getHistoryDir();
        if (!this.fs.exists(historyDir)) {
            this.fs.mkdir(historyDir);
        }

        const timestamp = new Date().toISOString();
        const id = `${type}-${Date.now()}`;
        const filename = `${id}.json`;

        const contentPath = this.fs.join(historyDir, filename);
        this.fs.writeFile(contentPath, content);

        const indexFile = this.getHistoryIndexFile();
        let index: HistoryEntry[] = [];
        if (this.fs.exists(indexFile)) {
            try {
                index = JSON.parse(this.fs.readFile(indexFile));
            } catch (e) {
                // ignore corrupt index
            }
        }

        const entry: HistoryEntry = {
            id,
            timestamp,
            type,
            description,
        };

        index.unshift(entry); // Add to beginning
        if (index.length > 50) {
            const removed = index.splice(50);
            for (const item of removed) {
                const p = this.fs.join(historyDir, `${item.id}.json`);
                if (this.fs.exists(p)) this.fs.unlink(p);
            }
        }

        this.fs.writeFile(indexFile, JSON.stringify(index, null, 2));
        return id;
    }

    getHistory(): HistoryEntry[] {
        try {
            const indexFile = this.getHistoryIndexFile();
            console.log('[HistoryService] Reading history from:', indexFile);
            if (!this.fs.exists(indexFile)) {
                console.log('[HistoryService] Index file not found');
                return [];
            }
            const content = this.fs.readFile(indexFile);
            return JSON.parse(content);
        } catch (e: any) {
            console.error('[HistoryService] Error reading history:', e);
            return [];
        }
    }
}
