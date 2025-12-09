import { z } from 'zod';

// Re-export schemas from CLI package for consistency
export {
    McpServerSchema,
    MasterMcpConfigSchema,
    SyncConfigSchema,
} from '@ai-cli-syncer/cli';

export {
    RulesConfigSchema,
    GlobalConfigSchema,
} from '@ai-cli-syncer/cli';

// ==========================================
// Config API Schemas
// ==========================================

export const GetConfigQuerySchema = z.object({
    path: z.string().min(1, 'Path is required'),
});

export const SaveConfigBodySchema = z.object({
    path: z.string().min(1, 'Path is required'),
    content: z.string(),
});

// ==========================================
// Rules API Schemas
// ==========================================

export const SaveMasterRulesBodySchema = z.object({
    content: z.string(),
});

export const CreateRuleBodySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    content: z.string(),
});

export const UpdateRuleBodySchema = z.object({
    content: z.string(),
    name: z.string().optional(),
});

export const RuleIdParamsSchema = z.object({
    id: z.string().uuid('Invalid rule ID format'),
});

export const SyncRulesBodySchema = z.object({
    toolId: z.string().optional(),
    strategy: z.enum(['overwrite', 'append', 'smart-update']).optional(),
    global: z.boolean().optional(),
    sourceId: z.string().uuid().optional(),
});

// ==========================================
// MCP API Schemas
// ==========================================

export const SaveMasterMcpBodySchema = z.object({
    mcpServers: z.record(
        z.object({
            command: z.string().min(1, 'Command is required'),
            args: z.array(z.string()),
            description: z.string().optional(),
            category: z.string().optional(),
            env: z.record(z.string()).optional(),
        })
    ),
});

export const SyncMcpBodySchema = z.object({
    toolId: z.string().optional(),
    serverIds: z.array(z.string()).optional(),
    strategy: z.enum(['overwrite', 'append', 'smart-update']).optional(),
    global: z.boolean().optional(),
    targetPath: z.string().optional(),
    sourceId: z.string().uuid().optional(),
});

export const CreateMcpDefinitionBodySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    command: z.string().min(1, 'Command is required'),
    args: z.array(z.string()),
    description: z.string().optional(),
    env: z.record(z.string()).optional(),
});

export const UpdateMcpDefinitionBodySchema = z.object({
    name: z.string().min(1).optional(),
    command: z.string().min(1).optional(),
    args: z.array(z.string()).optional(),
    description: z.string().optional(),
    env: z.record(z.string()).optional(),
});

export const McpIdParamsSchema = z.object({
    id: z.string().uuid('Invalid MCP definition ID format'),
});

// ==========================================
// MCP Sets API Schemas
// ==========================================

export const McpSetItemSchema = z.object({
    serverId: z.string().uuid('Invalid server ID'),
    disabled: z.boolean().optional(),
});

export const CreateMcpSetBodySchema = z.object({
    name: z.string().min(1, 'Name is required'),
    items: z.array(McpSetItemSchema),
    description: z.string().optional(),
});

export const UpdateMcpSetBodySchema = z.object({
    name: z.string().min(1).optional(),
    items: z.array(McpSetItemSchema).optional(),
    description: z.string().optional(),
});

export const McpSetIdParamsSchema = z.object({
    id: z.string().uuid('Invalid MCP set ID format'),
});

// ==========================================
// Stats API Schemas
// ==========================================

export const GetActivityQuerySchema = z.object({
    limit: z.string().regex(/^\d+$/).transform(Number).optional(),
    offset: z.string().regex(/^\d+$/).transform(Number).optional(),
});

// ==========================================
// Type Exports
// ==========================================

export type GetConfigQuery = z.infer<typeof GetConfigQuerySchema>;
export type SaveConfigBody = z.infer<typeof SaveConfigBodySchema>;
export type SaveMasterRulesBody = z.infer<typeof SaveMasterRulesBodySchema>;
export type CreateRuleBody = z.infer<typeof CreateRuleBodySchema>;
export type UpdateRuleBody = z.infer<typeof UpdateRuleBodySchema>;
export type SyncRulesBody = z.infer<typeof SyncRulesBodySchema>;
export type SaveMasterMcpBody = z.infer<typeof SaveMasterMcpBodySchema>;
export type SyncMcpBody = z.infer<typeof SyncMcpBodySchema>;
export type CreateMcpDefinitionBody = z.infer<typeof CreateMcpDefinitionBodySchema>;
export type UpdateMcpDefinitionBody = z.infer<typeof UpdateMcpDefinitionBodySchema>;
export type CreateMcpSetBody = z.infer<typeof CreateMcpSetBodySchema>;
export type UpdateMcpSetBody = z.infer<typeof UpdateMcpSetBodySchema>;
