import { GlobalConfig } from '../ISyncService.js';

export interface IGlobalConfigRepository {
    load(): Promise<GlobalConfig>;
    save(config: GlobalConfig): Promise<void>;
    init(): Promise<void>;
}
