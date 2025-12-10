import { SyncConfig } from '../ISyncService.js';

export interface ISyncConfigRepository {
    load(): Promise<SyncConfig>;
    save(config: SyncConfig): Promise<void>;
}
