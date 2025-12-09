import fs from 'fs';
import path from 'path';
import { getConfigDir } from '../constants/paths.js';

export type HistoryType = 'rules' | 'mcp' | 'sync';

export interface HistoryEntry {
    id: string;
    timestamp: string;
    type: HistoryType;
    description?: string;
}

import os from 'os';

function getHistoryDir(): string {
    // 동기 함수이므로 직접 경로 계산
    return path.join(getConfigDir(), 'history');
}

function getHistoryIndexFile(): string {
    return path.join(getHistoryDir(), 'index.json');
}

export function saveVersion(type: HistoryType, content: string, description?: string): string {
    const historyDir = getHistoryDir();
    if (!fs.existsSync(historyDir)) {
        fs.mkdirSync(historyDir, { recursive: true });
    }

    const timestamp = new Date().toISOString();
    const id = `${type}-${Date.now()}`;
    const filename = `${id}.json`; // Storing content in JSON wrapper or raw? Let's store raw content for simplicity but maybe metadata separate.
    // Actually, let's store the content in a file named by ID.

    const contentPath = path.join(historyDir, filename);
    fs.writeFileSync(contentPath, content, 'utf-8');

    // Update index
    const indexFile = getHistoryIndexFile();
    let index: HistoryEntry[] = [];
    if (fs.existsSync(indexFile)) {
        try {
            index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
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
    // Limit history size? Let's keep last 50 for now.
    if (index.length > 50) {
        const removed = index.splice(50);
        // Clean up files
        for (const item of removed) {
            const p = path.join(historyDir, `${item.id}.json`);
            if (fs.existsSync(p)) fs.unlinkSync(p);
        }
    }

    fs.writeFileSync(indexFile, JSON.stringify(index, null, 2));
    return id;
}

export function listVersions(type?: HistoryType): HistoryEntry[] {
    const indexFile = getHistoryIndexFile();
    if (!fs.existsSync(indexFile)) return [];

    try {
        const index: HistoryEntry[] = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        if (type) {
            return index.filter(e => e.type === type);
        }
        return index;
    } catch (e) {
        return [];
    }
}

export function getVersionContent(id: string): string | null {
    const historyDir = getHistoryDir();
    const contentPath = path.join(historyDir, `${id}.json`);
    if (fs.existsSync(contentPath)) {
        return fs.readFileSync(contentPath, 'utf-8');
    }
    return null;
}
