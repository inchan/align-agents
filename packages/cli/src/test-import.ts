import { NodeFileSystem } from './infrastructure/NodeFileSystem.js';
import { RulesService } from './services/impl/RulesService.js';
import { SyncService } from './services/impl/SyncService.js';
import { HistoryService } from './services/impl/HistoryService.js';

console.log('Starting import test...');

try {
    const fs = new NodeFileSystem();
    console.log('NodeFileSystem created');

    const rulesService = new RulesService(fs);
    console.log('RulesService created');

    const syncService = new SyncService(fs);
    console.log('SyncService created');

    const historyService = new HistoryService(fs);
    console.log('HistoryService created');

    console.log('All services created successfully');
} catch (error) {
    console.error('Error creating services:', error);
}
