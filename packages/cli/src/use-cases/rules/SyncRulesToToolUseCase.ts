import { IUseCase } from '../IUseCase.js';
import { IRulesService } from '../../interfaces/IRulesService.js';
import { SyncRulesToToolRequest, SyncRulesToToolResponse } from './RulesDTOs.js';

export class SyncRulesToToolUseCase implements IUseCase<SyncRulesToToolRequest, SyncRulesToToolResponse> {
    constructor(private rulesService: IRulesService) { }

    async execute(request: SyncRulesToToolRequest): Promise<SyncRulesToToolResponse> {
        try {
            await this.rulesService.syncToolRules(
                request.toolId,
                request.targetPath,
                request.global || false,
                request.strategy || 'overwrite',
                request.backupOptions,
                request.sourceId
            );

            return {
                success: true,
                toolId: request.toolId,
                targetPath: request.targetPath,
                message: `Successfully synced rules to ${request.toolId}`,
            };
        } catch (error: any) {
            return {
                success: false,
                toolId: request.toolId,
                targetPath: request.targetPath,
                message: error.message,
            };
        }
    }
}
