import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { uiCommand } from './commands/ui.js';
import { scanCommand } from './commands/scan.js';
import { mcpCommand } from './commands/mcp.js';
import { syncCommand } from './commands/sync.js';
import { configCommand } from './commands/config.js';
import { rulesCommand } from './commands/rules.js';
import { statusCommand } from './commands/status.js';
import { validateCommand } from './commands/validate.js';
import { SyncRulesToToolUseCase } from './use-cases/rules/SyncRulesToToolUseCase.js';

// Logger exports
export { LoggerService } from './services/LoggerService.js';
export { LogInterceptor } from './infrastructure/LogInterceptor.js';

// Service exports
export { NodeFileSystem } from './infrastructure/NodeFileSystem.js';
export { RulesService } from './services/impl/RulesService.js';
export { SyncService } from './services/impl/SyncService.js';
export { HistoryService } from './services/impl/HistoryService.js';
export { scanForTools } from './services/scanner.js';
export { ProjectScanner } from './services/ProjectScanner.js';
export { ProjectService } from './services/ProjectService.js';
export type { UserProject } from './services/ProjectService.js';

// UseCase exports
export { SyncRulesToToolUseCase } from './use-cases/rules/SyncRulesToToolUseCase.js';
export { SyncRulesToAllToolsUseCase } from './use-cases/rules/SyncRulesToAllToolsUseCase.js';
export { LoadMasterRulesUseCase } from './use-cases/rules/LoadMasterRulesUseCase.js';
export { LoadMasterMcpUseCase } from './use-cases/mcp/LoadMasterMcpUseCase.js';
export { SyncMcpToToolUseCase } from './use-cases/mcp/SyncMcpToToolUseCase.js';
export { SyncMcpToAllToolsUseCase } from './use-cases/mcp/SyncMcpToAllToolsUseCase.js';
import { backupCommand } from './commands/backup.js';
import { historyCommand } from './commands/history.js';

const program = new Command();

program
    .name('acs')
    .description('AI CLI Syncer - AI 도구 설정 관리')
    .version('0.1.0');

program.addCommand(initCommand);
program.addCommand(uiCommand);
program.addCommand(scanCommand);
program.addCommand(statusCommand);
program.addCommand(validateCommand);
program.addCommand(backupCommand);
program.addCommand(mcpCommand);
program.addCommand(syncCommand);
program.addCommand(configCommand);
program.addCommand(rulesCommand);
program.addCommand(historyCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
    program.outputHelp();
}
