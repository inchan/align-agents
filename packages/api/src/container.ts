import { NodeFileSystem, RulesService, SyncService, HistoryService, McpService } from '@ai-cli-syncer/cli';

const fs = new NodeFileSystem();

export const rulesService = new RulesService(fs);
export const syncService = new SyncService(fs);
export const historyService = new HistoryService(fs);
export const mcpService = new McpService(); // No longer needs file system

