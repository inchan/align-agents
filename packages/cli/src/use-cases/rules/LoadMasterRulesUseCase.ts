import { IUseCase } from '../IUseCase.js';
import { IRulesService } from '../../interfaces/IRulesService.js';
import { LoadMasterRulesRequest, LoadMasterRulesResponse } from './RulesDTOs.js';
import path from 'path';
import os from 'os';

export class LoadMasterRulesUseCase implements IUseCase<LoadMasterRulesRequest, LoadMasterRulesResponse> {
    constructor(private rulesService: IRulesService) { }

    execute(request: LoadMasterRulesRequest): LoadMasterRulesResponse {
        const content = this.rulesService.loadMasterRules();
        const masterDir = path.join(os.homedir(), '.config', 'ai-cli-syncer');
        const rulesPath = path.join(masterDir, 'master-rules.md');

        return {
            content,
            path: rulesPath,
        };
    }
}
