import { IUseCase } from '../IUseCase.js';
import { ISyncService } from '../../interfaces/ISyncService.js';
import { SyncMcpToToolRequest, SyncMcpToToolResponse } from './McpDTOs.js';
import { DomainError, McpSyncError } from '@align-agents/errors';

export class SyncMcpToToolUseCase implements IUseCase<SyncMcpToToolRequest, SyncMcpToToolResponse> {
    constructor(private syncService: ISyncService) { }

    async execute(request: SyncMcpToToolRequest): Promise<SyncMcpToToolResponse> {
        try {
            const syncedServers = await this.syncService.syncToolMcp(
                request.toolId,
                request.configPath,
                request.serverIds || null,
                request.strategy || 'overwrite',
                undefined,
                request.sourceId
            );

            return {
                success: true,
                toolId: request.toolId,
                configPath: request.configPath,
                syncedServers,
                message: `Successfully synced ${syncedServers.length} MCP servers to ${request.toolId}`,
            };
        } catch (error: unknown) {
            const domainError = DomainError.isDomainError(error)
                ? error
                : new McpSyncError(request.toolId, error instanceof Error ? error.message : String(error));

            return {
                success: false,
                toolId: request.toolId,
                configPath: request.configPath,
                syncedServers: [],
                message: domainError.message,
                error: {
                    code: domainError.code,
                    message: domainError.message,
                    details: domainError.details,
                },
            };
        }
    }
}
