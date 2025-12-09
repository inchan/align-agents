import { IUseCase } from '../IUseCase.js';
import { ISyncService } from '../../interfaces/ISyncService.js';
import { LoadMasterMcpRequest, LoadMasterMcpResponse } from './McpDTOs.js';
import path from 'path';
import os from 'os';

export class LoadMasterMcpUseCase implements IUseCase<LoadMasterMcpRequest, LoadMasterMcpResponse> {
    constructor(private syncService: ISyncService) { }

    execute(request: LoadMasterMcpRequest): LoadMasterMcpResponse {
        const config = this.syncService.loadMasterMcp();
        const masterDir = path.join(os.homedir(), '.config', 'ai-cli-syncer');
        const mcpPath = path.join(masterDir, 'master-mcp.json');

        return {
            mcpServers: config.mcpServers,
            path: mcpPath,
        };
    }
}
