import { z } from 'zod';

// MCP 서버 타입
export const McpServerTypeSchema = z.enum(['stdio', 'http', 'sse']);

// stdio 타입 MCP 서버 스키마
export const StdioMcpServerSchema = z.object({
    command: z.string().min(1, 'Command is required'),
    args: z.array(z.string()),
    cwd: z.string().optional(),
    description: z.string().optional(),
    category: z.string().optional(),
    env: z.record(z.string()).optional(),
});

// HTTP/SSE 타입 MCP 서버 스키마
export const HttpMcpServerSchema = z.object({
    type: z.enum(['http', 'sse']),
    url: z.string().url('Valid URL is required'),
    description: z.string().optional(),
    category: z.string().optional(),
    env: z.record(z.string()).optional(),
});

// MCP 서버 스키마 (stdio 또는 http/sse)
export const McpServerSchema = z.union([StdioMcpServerSchema, HttpMcpServerSchema]);

// 마스터 MCP 설정 스키마
export const MasterMcpConfigSchema = z.object({
    mcpServers: z.record(McpServerSchema),
});

// 동기화 설정 스키마
export const SyncConfigSchema = z.record(
    z.object({
        enabled: z.boolean(),
        servers: z.array(z.string()).nullable(),
        mcpSetId: z.string().nullable().optional(),
    })
);

// 타입 추출
export type McpServer = z.infer<typeof McpServerSchema>;
export type MasterMcpConfig = z.infer<typeof MasterMcpConfigSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
