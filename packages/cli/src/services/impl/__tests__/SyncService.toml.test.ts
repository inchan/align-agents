/**
 * TOML 동기화 통합 테스트
 * 실제 @iarna/toml 라이브러리를 사용하여 Codex TOML 형식 검증
 */
import { describe, it, expect, beforeAll } from 'vitest';
import * as TOML from '@iarna/toml';

describe('SyncService TOML Integration', () => {
    describe('TOML mcp_servers key handling', () => {
        it('should use mcp_servers key for TOML format (Codex)', () => {
            // Codex 공식 TOML 형식
            const codexToml = `
model = "gpt-4o"
approval_mode = "suggest"

[mcp_servers.existing_server]
command = "node"
args = [ "existing.js" ]
`;
            // TOML 파싱
            const parsed = TOML.parse(codexToml) as any;

            // mcp_servers 키 확인 (underscore)
            expect(parsed).toHaveProperty('mcp_servers');
            expect(parsed.mcp_servers).toHaveProperty('existing_server');
            expect(parsed.mcp_servers.existing_server.command).toBe('node');
        });

        it('should preserve other config fields when syncing TOML', () => {
            const codexToml = `
model = "gpt-4o"
approval_mode = "suggest"

[mcp_servers.old_server]
command = "node"
args = [ "old.js" ]
`;
            const parsed = TOML.parse(codexToml) as any;

            // 새 서버 추가 (append 전략)
            const newServers = {
                new_server: { command: 'npx', args: ['-y', 'new-mcp'] }
            };
            parsed.mcp_servers = { ...parsed.mcp_servers, ...newServers };

            // 직렬화
            const output = TOML.stringify(parsed);

            // 다른 필드 보존 확인
            expect(output).toContain('model = "gpt-4o"');
            expect(output).toContain('approval_mode = "suggest"');
            // 기존 서버 유지
            expect(output).toContain('[mcp_servers.old_server]');
            // 새 서버 추가
            expect(output).toContain('[mcp_servers.new_server]');
        });

        it('should handle overwrite strategy in TOML', () => {
            const codexToml = `
model = "gpt-4o"

[mcp_servers.old_server]
command = "node"
args = [ "old.js" ]
`;
            const parsed = TOML.parse(codexToml) as any;

            // overwrite 전략: 기존 mcp_servers 완전 교체
            const newServers = {
                new_server: { command: 'npx', args: ['-y', 'new-mcp'] }
            };
            parsed.mcp_servers = { ...newServers };

            const output = TOML.stringify(parsed);

            // 기존 서버 삭제됨
            expect(output).not.toContain('old_server');
            // 새 서버만 존재
            expect(output).toContain('[mcp_servers.new_server]');
        });

        it('should handle env field in TOML', () => {
            const config = {
                mcp_servers: {
                    test_server: {
                        command: 'npx',
                        args: ['-y', 'mcp-test'],
                        env: { API_KEY: 'secret-key', DEBUG: 'true' }
                    }
                }
            };

            const tomlOutput = TOML.stringify(config as any);
            const parsed = TOML.parse(tomlOutput) as any;

            // env 필드 왕복 변환 확인
            expect(parsed.mcp_servers.test_server.env).toEqual({
                API_KEY: 'secret-key',
                DEBUG: 'true'
            });
        });

        it('should parse both inline and sub-table env formats', () => {
            // 인라인 테이블 형식 (공식 문서 예시)
            const inlineEnv = `
[mcp_servers.server1]
command = "npx"
args = [ "-y", "mcp-test" ]
env = { API_KEY = "secret" }
`;
            // 서브 테이블 형식 (@iarna/toml 출력)
            const subTableEnv = `
[mcp_servers.server1]
command = "npx"
args = [ "-y", "mcp-test" ]

[mcp_servers.server1.env]
API_KEY = "secret"
`;
            const parsed1 = TOML.parse(inlineEnv) as any;
            const parsed2 = TOML.parse(subTableEnv) as any;

            // 두 형식 모두 동일하게 파싱됨
            expect(parsed1.mcp_servers.server1.env).toEqual({ API_KEY: 'secret' });
            expect(parsed2.mcp_servers.server1.env).toEqual({ API_KEY: 'secret' });
        });

        it('should correctly distinguish mcpKey based on format', () => {
            // 이 테스트는 SyncService의 로직을 시뮬레이션
            const determineKey = (format: 'json' | 'toml') =>
                format === 'toml' ? 'mcp_servers' : 'mcpServers';

            expect(determineKey('toml')).toBe('mcp_servers');
            expect(determineKey('json')).toBe('mcpServers');
        });
    });

    describe('TOML-JSON roundtrip', () => {
        it('should preserve data integrity in TOML roundtrip', () => {
            const original = {
                model: 'gpt-4o',
                mcp_servers: {
                    filesystem: {
                        command: 'npx',
                        args: ['-y', '@modelcontextprotocol/server-filesystem', '/path'],
                        env: { PATH_PREFIX: '/home/user' }
                    }
                }
            };

            // TOML 직렬화 → 파싱
            const tomlString = TOML.stringify(original as any);
            const parsed = TOML.parse(tomlString);

            // 데이터 무결성 확인
            expect(parsed).toEqual(original);
        });
    });

    describe('All sync strategies', () => {
        const existingToml = `
model = "gpt-4o"
approval_mode = "suggest"

[mcp_servers.user_server1]
command = "node"
args = [ "user-mcp.js" ]

[mcp_servers.user_server2]
command = "python"
args = [ "custom.py" ]
`;

        const masterServers = {
            master_server1: { command: 'npx', args: ['-y', 'mcp-master1'] },
            master_server2: { command: 'npx', args: ['-y', 'mcp-master2'] },
            user_server2: { command: 'npx', args: ['-y', 'override-user2'] } // 충돌
        };

        it('OVERWRITE: should replace all mcp_servers', () => {
            const config = TOML.parse(existingToml) as any;
            config.mcp_servers = { ...masterServers };

            expect(config.mcp_servers.user_server1).toBeUndefined();
            expect(config.mcp_servers.master_server1).toBeDefined();
            expect(config.mcp_servers.user_server2.command).toBe('npx');
        });

        it('APPEND: should merge with existing, new wins on conflict', () => {
            const config = TOML.parse(existingToml) as any;
            config.mcp_servers = { ...config.mcp_servers, ...masterServers };

            expect(config.mcp_servers.user_server1).toBeDefined();
            expect(config.mcp_servers.user_server1.command).toBe('node');
            expect(config.mcp_servers.master_server1).toBeDefined();
            expect(config.mcp_servers.user_server2.command).toBe('npx'); // 새것 우선
        });

        it('should preserve non-mcp fields', () => {
            const config = TOML.parse(existingToml) as any;
            config.mcp_servers = { ...masterServers };

            expect(config.model).toBe('gpt-4o');
            expect(config.approval_mode).toBe('suggest');
        });

        it('SELECTIVE: should sync only selected servers', () => {
            const config = TOML.parse(existingToml) as any;
            const selected = ['master_server1'];
            const filtered: Record<string, any> = {};

            for (const name of selected) {
                if (masterServers[name as keyof typeof masterServers]) {
                    filtered[name] = masterServers[name as keyof typeof masterServers];
                }
            }
            config.mcp_servers = { ...config.mcp_servers, ...filtered };

            expect(config.mcp_servers.master_server1).toBeDefined();
            expect(config.mcp_servers.master_server2).toBeUndefined();
            expect(config.mcp_servers.user_server2.command).toBe('python'); // 원본 유지
        });
    });
});
