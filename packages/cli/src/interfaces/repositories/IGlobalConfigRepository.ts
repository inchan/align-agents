import { GlobalConfig } from '../ISyncService.js';

export interface IGlobalConfigRepository {
    load(): GlobalConfig;
    save(config: GlobalConfig): void;
}
