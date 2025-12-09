import { IUseCase } from '../IUseCase.js';
import { ISyncService } from '../../interfaces/ISyncService.js';
import { scanForTools } from '../../services/scanner.js';
import { SyncMcpToAllToolsRequest, SyncMcpToAllToolsResponse } from './McpDTOs.js';

export class SyncMcpToAllToolsUseCase implements IUseCase<SyncMcpToAllToolsRequest, SyncMcpToAllToolsResponse> {
    constructor(private syncService: ISyncService) { }

    async execute(request: SyncMcpToAllToolsRequest): Promise<SyncMcpToAllToolsResponse> {
        const registry = request.registry ?? { tools: await scanForTools() };
        const results = await this.syncService.syncAllTools(request.sourceId, registry.tools);

        return {
            results: results.map(result => {
                let status: 'success' | 'error' | 'skipped' = 'error';
                if (result.status === 'success') status = 'success';
                else if (result.status === 'skipped') status = 'skipped';
                // 'unsupported' is treated as 'skipped' or 'error' depending on requirements, here mapping to 'skipped' for now or keeping 'error' default
                if (result.status === 'unsupported') status = 'skipped';

                return {
                    toolId: result.toolId,
                    status: status,
                    configPath: result.path,
                    syncedServers: result.servers,
                    message: result.message,
                };
            }),
        };
    }
}
