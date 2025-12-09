import { describe, it, expect } from 'vitest';
import { applySyncStrategy, MARKER_START, MARKER_END, deepMergeMcpServers } from '../strategies.js';
import { EOL } from 'os';

describe('Sync Strategies', () => {
    const newContent = 'New Rules';

    describe('overwrite', () => {
        it('should replace existing content', () => {
            const current = 'Old Rules';
            const result = applySyncStrategy(current, newContent, 'overwrite');
            expect(result).toBe(newContent);
        });
    });



    describe('smart-update', () => {
        it('should wrap content with markers if no markers exist', () => {
            const current = 'User Custom Rules';
            const result = applySyncStrategy(current, newContent, 'smart-update');

            expect(result).toContain(current);
            expect(result).toContain(MARKER_START);
            expect(result).toContain(newContent);
            expect(result).toContain(MARKER_END);
        });

        it('should update content between markers', () => {
            const oldGenerated = 'Old Generated Rules';
            const current = `User Rules${EOL}${MARKER_START}${EOL}${oldGenerated}${EOL}${MARKER_END}${EOL}More User Rules`;

            const result = applySyncStrategy(current, newContent, 'smart-update');

            expect(result).toContain('User Rules');
            expect(result).toContain('More User Rules');
            expect(result).not.toContain(oldGenerated);
            expect(result).toContain(newContent);

            // 구조 확인
            const expected = `User Rules${EOL}${MARKER_START}${EOL}${newContent}${EOL}${MARKER_END}${EOL}More User Rules`;
            expect(result).toBe(expected);
        });

        it('should handle file with only markers', () => {
            const current = `${MARKER_START}${EOL}Old${EOL}${MARKER_END}`;
            const result = applySyncStrategy(current, newContent, 'smart-update');

            expect(result).toBe(`${MARKER_START}${EOL}${newContent}${EOL}${MARKER_END}`);
        });

        it('wraps new content when current is empty', () => {
            const result = applySyncStrategy('', newContent, 'smart-update');
            expect(result).toBe(`${MARKER_START}${EOL}${newContent}${EOL}${MARKER_END}`);
        });

        it('appends markers with no extra newline when current ends with EOL', () => {
            const current = `Existing${EOL}`;
            const result = applySyncStrategy(current, newContent, 'smart-update');
            expect(result).toBe(`Existing${EOL}${MARKER_START}${EOL}${newContent}${EOL}${MARKER_END}`);
        });
    });

    describe('unknown strategy', () => {
        it('throws for invalid strategy', () => {
            expect(() => applySyncStrategy('a', 'b', 'invalid' as any)).toThrowError('Unknown sync strategy');
        });
    });
});


