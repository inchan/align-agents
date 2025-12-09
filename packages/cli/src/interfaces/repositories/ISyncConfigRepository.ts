import { SyncConfig } from '../ISyncService.js';

export interface ISyncConfigRepository {
    load(): SyncConfig;
    save(config: SyncConfig): void;
}
