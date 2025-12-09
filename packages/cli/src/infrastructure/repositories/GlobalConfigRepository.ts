import { IFileSystem } from '../../interfaces/IFileSystem.js';
import { IGlobalConfigRepository } from '../../interfaces/repositories/IGlobalConfigRepository.js';
import { GlobalConfig } from '../../interfaces/ISyncService.js';
import { validateData } from '../../utils/validation.js';
import { GlobalConfigSchema } from '../../schemas/rules.schema.js';

export class GlobalConfigRepository implements IGlobalConfigRepository {
    constructor(
        private fs: IFileSystem,
        private configDir: string,
        private legacyConfigPath: string,
        private defaultConfig: GlobalConfig
    ) { }

    private getConfigPath(): string {
        return this.fs.join(this.configDir, 'config.json');
    }

    private getDefaultConfig(): GlobalConfig {
        return this.defaultConfig;
    }

    init(): void {
        const configPath = this.getConfigPath();

        if (this.fs.exists(configPath)) {
            return;
        }

        const defaultConfig = this.getDefaultConfig();
        this.save(defaultConfig);
        console.log(`[CLI] config.json이 생성되었습니다: ${configPath}`);
    }

    load(): GlobalConfig {
        const configPath = this.getConfigPath();

        if (this.fs.exists(configPath)) {
            try {
                const data = this.fs.readFile(configPath);
                return JSON.parse(data);
            } catch (error) {
                console.warn(`[CLI] config.json을 파싱할 수 없어 기본 설정으로 대체합니다. (${configPath})`, error);
                return this.getDefaultConfig();
            }
        }

        if (this.fs.exists(this.legacyConfigPath)) {
            try {
                const legacyData = JSON.parse(this.fs.readFile(this.legacyConfigPath));
                const migrated = { ...this.defaultConfig, ...legacyData };
                this.save(migrated);
                console.warn(`[acs] 레거시 전역 설정을 ${configPath}로 마이그레이션했습니다.`);
                return migrated;
            } catch (error) {
                console.warn('[acs] 레거시 전역 설정 마이그레이션에 실패하여 기본값을 사용합니다.', error);
            }
        }

        return this.defaultConfig;
    }

    save(config: GlobalConfig): void {
        const validatedConfig = validateData(GlobalConfigSchema, config, 'Invalid global config');

        if (!this.fs.exists(this.configDir)) {
            this.fs.mkdir(this.configDir);
        }

        const configPath = this.getConfigPath();
        this.fs.writeFile(configPath, JSON.stringify(validatedConfig, null, 2));
    }
}
