import { IUseCase } from '../IUseCase.js';
import { ISyncService } from '../../interfaces/ISyncService.js';
import { SyncMcpToToolRequest, SyncMcpToToolResponse } from './McpDTOs.js';

export class SyncMcpToToolUseCase implements IUseCase<SyncMcpToToolRequest, SyncMcpToToolResponse> {
    constructor(private syncService: ISyncService) { }

    async execute(request: SyncMcpToToolRequest): Promise<SyncMcpToToolResponse> {
        try {
            const results = await this.syncService.syncToolMcp(
                request.toolId,
                request.configPath,
                request.serverIds || null, // Convert undefined/empty to null if allowed by service, or just pass as is if service handles it. Service takes string[] | null.
                request.strategy,
                undefined,
                request.sourceId
            );

            return {
                success: true,
                toolId: request.toolId,
                configPath: request.configPath,
                syncedServers: request.serverIds || [],
                message: `Successfully synced ${(request.serverIds || []).length} MCP servers to ${request.toolId}`,
            };
        } catch (error: any) {
            return {
                success: false,
                toolId: request.toolId,
                configPath: request.configPath,
                syncedServers: [],
                message: error.message,
            };
        }
    }
}
