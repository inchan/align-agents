import { IUseCase } from '../IUseCase.js';
import { IRulesService } from '../../interfaces/IRulesService.js';
import { SyncRulesToToolRequest, SyncRulesToToolResponse } from './RulesDTOs.js';
import { SyncHistoryRepository } from '../../infrastructure/repositories/SyncHistoryRepository.js';
import { nanoid } from 'nanoid';

export class SyncRulesToToolUseCase implements IUseCase<SyncRulesToToolRequest, SyncRulesToToolResponse> {
    constructor(
        private rulesService: IRulesService,
        private syncHistoryRepo?: SyncHistoryRepository // Optional for backward compatibility
    ) { }

    async execute(request: SyncRulesToToolRequest): Promise<SyncRulesToToolResponse> {
        const startTime = Date.now();
        const historyId = nanoid();

        try {
            await this.rulesService.syncToolRules(
                request.toolId,
                request.targetPath,
                request.global || false,
                request.strategy || 'overwrite',
                request.backupOptions,
                request.sourceId
            );

            const duration = Date.now() - startTime;

            // Record success in sync history
            if (this.syncHistoryRepo) {
                try {
                    this.syncHistoryRepo.create({
                        id: historyId,
                        target_type: request.sourceId ? 'rule' : 'all_rules',
                        target_id: request.sourceId,
                        target_name: request.ruleName || 'Rules',
                        tool_id: request.toolId,
                        tool_name: request.toolName || request.toolId,
                        status: 'success',
                        success_count: 1,
                        failed_count: 0,
                        skipped_count: 0,
                        strategy: request.strategy,
                        duration_ms: duration,
                        triggered_by: request.triggeredBy || 'manual'
                    });
                } catch (historyError) {
                    // Don't fail the sync if history recording fails
                    console.error('Failed to record sync history:', historyError);
                }
            }

            return {
                success: true,
                toolId: request.toolId,
                targetPath: request.targetPath,
                message: `VERIFIED_UPDATE: Successfully synced rules to ${request.toolId}`,
                historyId
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Record failure in sync history
            if (this.syncHistoryRepo) {
                try {
                    this.syncHistoryRepo.create({
                        id: historyId,
                        target_type: request.sourceId ? 'rule' : 'all_rules',
                        target_id: request.sourceId,
                        target_name: request.ruleName || 'Rules',
                        tool_id: request.toolId,
                        tool_name: request.toolName || request.toolId,
                        status: 'failed',
                        success_count: 0,
                        failed_count: 1,
                        skipped_count: 0,
                        strategy: request.strategy,
                        error_message: error.message,
                        details: JSON.stringify({ error: error.stack }),
                        duration_ms: duration,
                        triggered_by: request.triggeredBy || 'manual'
                    });
                } catch (historyError) {
                    console.error('Failed to record sync history:', historyError);
                }
            }

            return {
                success: false,
                toolId: request.toolId,
                targetPath: request.targetPath,
                message: error.message,
                historyId
            };
        }
    }
}
