import { IUseCase } from '../IUseCase.js';
import { IRulesService } from '../../interfaces/IRulesService.js';
import { SyncRulesToAllToolsRequest, SyncRulesToAllToolsResponse } from './RulesDTOs.js';

export class SyncRulesToAllToolsUseCase implements IUseCase<SyncRulesToAllToolsRequest, SyncRulesToAllToolsResponse> {
    constructor(private rulesService: IRulesService) { }

    async execute(request: SyncRulesToAllToolsRequest): Promise<SyncRulesToAllToolsResponse> {
        const results = await this.rulesService.syncAllToolsRules(
            request.targetPath,
            request.strategy || 'overwrite',
            request.sourceId
        );

        return {
            success: results.some(r => r.status === 'success'),
            results: results.map(r => {
                let status: 'success' | 'error' | 'skipped' = 'error';
                if (r.status === 'success') status = 'success';
                else if (r.status === 'skipped') status = 'skipped';
                else if (r.status === 'not-supported') status = 'skipped';

                return {
                    toolId: r.toolId,
                    toolName: r.toolName,
                    status: status,
                    targetPath: r.targetPath,
                    message: r.message,
                    rulesFilename: r.rulesFilename
                };
            }),
        };
    }
}
