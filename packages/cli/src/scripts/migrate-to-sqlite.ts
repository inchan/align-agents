import fs from 'fs';
import path from 'path';
import { getDatabase } from '../infrastructure/database.js';
import { GlobalConfigRepository } from '../infrastructure/repositories/GlobalConfigRepository.js';
import { SyncConfigRepository } from '../infrastructure/repositories/SyncConfigRepository.js';
import { RulesConfigRepository } from '../infrastructure/repositories/RulesConfigRepository.js';
import { McpRepository } from '../infrastructure/repositories/McpRepository.js';
import { GlobalConfig, SyncConfig } from '../interfaces/ISyncService.js';
import { RulesConfig } from '../interfaces/IRulesService.js';
import { McpSet } from '../interfaces/IMcpService.js';
import { ToolConfig } from '../repositories/ToolRepository.js';

async function migrate() {
    console.log('🔄 Starting migration to SQLite...');

    const defaultMaster = path.join(process.env.HOME || '', '.acs-master');
    const altMaster = path.join(process.env.HOME || '', '.ai-cli-syncer');

    let masterDir = process.env.ACS_MASTER_DIR;
    if (!masterDir) {
        if (fs.existsSync(defaultMaster)) {
            masterDir = defaultMaster;
        } else if (fs.existsSync(altMaster)) {
            masterDir = altMaster;
        } else {
            masterDir = defaultMaster; // Default for fresh run
        }
    }

    console.log(`  Source Master Directory: ${masterDir}`);

    const db = getDatabase();

    // 1. Global Config
    const globalConfigPath = path.join(masterDir, 'global-config.json');
    if (fs.existsSync(globalConfigPath)) {
        try {
            console.log('  Migrating global-config.json...');
            const data = JSON.parse(fs.readFileSync(globalConfigPath, 'utf8'));
            const repo = new GlobalConfigRepository(db, { masterDir: '', autoBackup: true }); // Default will be overwritten
            // Need to merge with existing logic or just save.
            // Since repo.save() takes GlobalConfig, we map raw JSON to it.
            const config: GlobalConfig = {
                masterDir: data.masterDir || masterDir,
                autoBackup: data.autoBackup ?? true
            };
            await repo.save(config);
            console.log('  ✅ Global config migrated.');
        } catch (e) {
            console.error('  ❌ Failed to migrate global config:', e);
        }
    } else {
        console.log('  Skipping global-config.json (not found)');
    }

    // 2. Sync Config
    const syncConfigPath = path.join(masterDir, 'sync-config.json');
    if (fs.existsSync(syncConfigPath)) {
        try {
            console.log('  Migrating sync-config.json...');
            const data = JSON.parse(fs.readFileSync(syncConfigPath, 'utf8'));
            const repo = new SyncConfigRepository(db);
            // SyncConfig is map of toolId -> { enabled, servers }
            // Ensure type safety
            const config: SyncConfig = {};
            for (const [key, val] of Object.entries(data)) {
                if (typeof val === 'object' && val !== null) {
                    config[key] = {
                        enabled: (val as any).enabled ?? false,
                        servers: (val as any).servers ?? null
                    };
                }
            }
            await repo.save(config);
            console.log('  ✅ Sync config migrated.');
        } catch (e) {
            console.error('  ❌ Failed to migrate sync config:', e);
        }
    } else {
        console.log('  Skipping sync-config.json (not found)');
    }

    // 3. Rules Config (and Rule content)
    const rulesConfigPath = path.join(masterDir, 'rules-config.json');
    if (fs.existsSync(rulesConfigPath)) {
        try {
            console.log('  Migrating rules-config.json...');
            const data = JSON.parse(fs.readFileSync(rulesConfigPath, 'utf8'));
            const repo = new RulesConfigRepository(db);

            // Migrate config
            const config: RulesConfig = {};
            for (const [key, val] of Object.entries(data)) {
                if (typeof val === 'object' && val !== null) {
                    config[key] = {
                        enabled: (val as any).enabled ?? true,
                        targetPath: (val as any).targetPath ?? '',
                        global: (val as any).global ?? true
                    };
                }
            }
            await repo.save(config);
            console.log('  ✅ Rules config migrated.');

            // Note: Rule content migration (from templates/ or actual rule files) might be more complex
            // For now, we only migrate the configuration. 
            // If the user wants to migrate physical rule files to DB, that would be a separate step.
            // Based on previous conversations, we are moving AWAY from file templates.
        } catch (e) {
            console.error('  ❌ Failed to migrate rules config:', e);
        }
    } else {
        console.log('  Skipping rules-config.json (not found)');
    }

    // 4. MCP Config (mcp-config.json -> mcp_definitions)
    const mcpConfigPath = path.join(masterDir, 'mcp-config.json');
    if (fs.existsSync(mcpConfigPath)) {
        try {
            console.log('  Migrating mcp-config.json...');
            const data = JSON.parse(fs.readFileSync(mcpConfigPath, 'utf8'));
            const repo = new McpRepository(db);

            if (data.mcpServers && typeof data.mcpServers === 'object') {
                for (const [name, config] of Object.entries(data.mcpServers)) {
                    const serverConfig = config as any;
                    // Check if definition already exists to avoid duplicates (by name)
                    // Since createDefinition generates a new ID, we rely on name uniqueness conceptually unless strict constraint
                    // We can't easily check by name with current repo interface (only getDefinition by ID)
                    // But we can get all definitions and check.
                    const existingDefs = await repo.getDefinitions();
                    const exists = existingDefs.find(d => d.name === name);

                    if (!exists) {
                        await repo.createDefinition({
                            name: name,
                            command: serverConfig.command || '',
                            args: serverConfig.args || [],
                            env: serverConfig.env || undefined,
                            description: serverConfig.description,
                            cwd: serverConfig.cwd
                        });
                        console.log(`    Migrated MCP server: ${name}`);
                    } else {
                        console.log(`    Skipping MCP server ${name} (already exists)`);
                    }
                }
            }

            console.log('  ✅ MCP config migrated.');
        } catch (e) {
            console.error('  ❌ Failed to migrate MCP config:', e);
        }
    } else {
        console.log('  Skipping mcp-config.json (not found)');
    }

    console.log('🏁 Migration completed.');
    process.exit(0);
}

migrate();
