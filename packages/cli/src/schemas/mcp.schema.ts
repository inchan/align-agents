import { z } from 'zod';

// MCP 서버 스키마
export const McpServerSchema = z.object({
    command: z.string().min(1, 'Command is required'),
    args: z.array(z.string()),
    description: z.string().optional(),
    category: z.string().optional(),
    env: z.record(z.string()).optional(),
});

// 마스터 MCP 설정 스키마
export const MasterMcpConfigSchema = z.object({
    mcpServers: z.record(McpServerSchema),
});

// 동기화 설정 스키마
export const SyncConfigSchema = z.record(
    z.object({
        enabled: z.boolean(),
        servers: z.array(z.string()).nullable(),
    })
);

// 타입 추출
export type McpServer = z.infer<typeof McpServerSchema>;
export type MasterMcpConfig = z.infer<typeof MasterMcpConfigSchema>;
export type SyncConfig = z.infer<typeof SyncConfigSchema>;
