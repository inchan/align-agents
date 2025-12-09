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

    describe('append', () => {
        it('should append new content', () => {
            const current = 'Old Rules';
            const result = applySyncStrategy(current, newContent, 'append');
            expect(result).toBe(`Old Rules${EOL}${EOL}New Rules`);
        });

        it('should not add extra newline when current ends with EOL', () => {
            const current = `Old Rules${EOL}`;
            const result = applySyncStrategy(current, newContent, 'append');
            expect(result).toBe(`Old Rules${EOL}New Rules`);
        });

        it('should handle empty current content', () => {
            const result = applySyncStrategy('', newContent, 'append');
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

describe('deepMergeMcpServers', () => {
    it('should preserve existing properties when merging', () => {
        const existing = {
            'my-server': {
                command: 'old-command',
                args: ['--old'],
                timeout: 30000,
                trust: true,
                includeTools: ['tool-a', 'tool-b'],
            },
        };

        const source = {
            'my-server': {
                command: 'new-command',
                args: ['--new'],
                env: { API_KEY: 'secret' },
            },
        };

        const result = deepMergeMcpServers(existing, source);

        // Source properties should override
        expect(result['my-server'].command).toBe('new-command');
        expect(result['my-server'].args).toEqual(['--new']);
        expect(result['my-server'].env).toEqual({ API_KEY: 'secret' });

        // Existing properties should be preserved
        expect(result['my-server'].timeout).toBe(30000);
        expect(result['my-server'].trust).toBe(true);
        expect(result['my-server'].includeTools).toEqual(['tool-a', 'tool-b']);
    });

    it('should add new servers without affecting existing ones', () => {
        const existing = {
            'server-a': { command: 'cmd-a', timeout: 5000 },
        };

        const source = {
            'server-b': { command: 'cmd-b', args: [] },
        };

        const result = deepMergeMcpServers(existing, source);

        expect(result['server-a']).toEqual({ command: 'cmd-a', timeout: 5000 });
        expect(result['server-b']).toEqual({ command: 'cmd-b', args: [] });
    });

    it('should handle empty existing config', () => {
        const existing = {};
        const source = {
            'new-server': { command: 'npx', args: ['-y', 'mcp-server'] },
        };

        const result = deepMergeMcpServers(existing, source);

        expect(result['new-server']).toEqual({ command: 'npx', args: ['-y', 'mcp-server'] });
    });

    it('should handle multiple servers with mixed scenarios', () => {
        const existing = {
            'updated-server': { command: 'old', trust: true, timeout: 10000 },
            'untouched-server': { command: 'keep', excludeTools: ['dangerous'] },
        };

        const source = {
            'updated-server': { command: 'new', args: ['--flag'] },
            'brand-new': { command: 'fresh' },
        };

        const result = deepMergeMcpServers(existing, source);

        // Updated server: merged
        expect(result['updated-server'].command).toBe('new');
        expect(result['updated-server'].args).toEqual(['--flag']);
        expect(result['updated-server'].trust).toBe(true);
        expect(result['updated-server'].timeout).toBe(10000);

        // Untouched server: preserved
        expect(result['untouched-server']).toEqual({ command: 'keep', excludeTools: ['dangerous'] });

        // Brand new server: added
        expect(result['brand-new']).toEqual({ command: 'fresh' });
    });
});
