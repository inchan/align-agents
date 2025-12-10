import fs from 'fs';
import path from 'path';
import os from 'os';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveVersion, listVersions, getVersionContent } from '../history.js';

// 임시 홈 디렉토리를 강제로 사용
let tempHome: string;

vi.spyOn(os, 'homedir').mockImplementation(() => tempHome);

describe('history service', () => {
    beforeEach(() => {
        tempHome = fs.mkdtempSync(path.join(os.tmpdir(), 'acs-history-'));
    });

    afterEach(() => {
        fs.rmSync(tempHome, { recursive: true, force: true });
    });

    it('saves version and lists by type', () => {
        const id1 = saveVersion('rules', 'rules-content', 'desc1');
        const id2 = saveVersion('mcp', 'mcp-content');

        const all = listVersions();
        expect(all.length).toBe(2);
        expect(all[0].id).toBe(id2);

        const rulesOnly = listVersions('rules');
        expect(rulesOnly).toHaveLength(1);
        expect(rulesOnly[0].id).toBe(id1);
    });

    it('gets version content by id', () => {
        const id = saveVersion('rules', 'payload');
        const content = getVersionContent(id);
        expect(content).toBe('payload');
    });

    it('returns null or empty array on missing/corrupt files', () => {
        expect(listVersions()).toEqual([]);
        expect(getVersionContent('missing')).toBeNull();

        const id = saveVersion('rules', 'ok');
        const indexFile = path.join(tempHome, '.align-agents', 'history', 'index.json');
        fs.writeFileSync(indexFile, '{not json}');
        expect(listVersions()).toEqual([]);

        const badPath = path.join(tempHome, '.align-agents', 'history', `${id}.json`);
        fs.unlinkSync(badPath);
        expect(getVersionContent(id)).toBeNull();
    });

    it('keeps only latest 50 entries', () => {
        const base = 1_000_000;
        let counter = 0;
        const nowMock = vi.spyOn(Date, 'now').mockImplementation(() => base + counter++);

        for (let i = 0; i < 55; i++) {
            saveVersion('rules', `c${i}`);
        }
        nowMock.mockRestore();

        const all = listVersions();
        expect(all.length).toBe(50);

        const oldestContent = getVersionContent(all[49].id);
        expect(oldestContent).toBe('c5');
    });

    it('cleans up missing files gracefully when trimming history', () => {
        const historyDir = path.join(tempHome, '.align-agents', 'history');
        fs.mkdirSync(historyDir, { recursive: true });
        const indexFile = path.join(historyDir, 'index.json');
        const fakeEntries = Array.from({ length: 51 }).map((_, i) => ({
            id: `fake-${i}`,
            timestamp: new Date().toISOString(),
            type: 'rules' as const,
        }));
        fs.writeFileSync(indexFile, JSON.stringify(fakeEntries, null, 2));

        saveVersion('rules', 'real');

        const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
        expect(index.length).toBe(50);
    });
});
