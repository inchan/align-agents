import { Command } from 'commander';
import chalk from 'chalk';
import { scanForTools, saveRegistry } from '../services/scanner.js';

export const scanCommand = new Command('scan')
    .description('Scan for installed AI tools and configurations')
    .action(async () => {
        console.log(chalk.blue('🔍 Scanning for AI tools...'));

        const tools = await scanForTools();
        const found = tools.filter(t => t.exists);
        const missing = tools.filter(t => !t.exists);

        console.log(chalk.bold(`\nFound ${found.length} tools:`));
        found.forEach(tool => {
            console.log(`${chalk.green('✔')} ${chalk.bold(tool.name)}`);
            console.log(`   ${chalk.dim(tool.configPath)}`);
        });

        if (missing.length > 0) {
            console.log(chalk.bold(`\nNot found (${missing.length}):`));
            missing.forEach(tool => {
                console.log(`${chalk.red('✖')} ${tool.name}`);
            });
        }

        const registryPath = saveRegistry(tools);
        console.log(chalk.dim(`\nRegistry saved to: ${registryPath}`));
    });
