import { Command } from 'commander';
import chalk from 'chalk';
import { loadMasterMcp, saveMasterMcp, type McpServer } from '../services/sync.js';

export const mcpCommand = new Command('mcp')
    .description('마스터 MCP 서버 관리')
    .action(() => {
        mcpCommand.help();
    });

// acs mcp list
mcpCommand
    .command('list')
    .description('마스터 MCP 서버 목록 보기')
    .action(() => {
        const config = loadMasterMcp();
        const servers = Object.entries(config.mcpServers);

        if (servers.length === 0) {
            console.log(chalk.yellow('마스터 MCP 서버가 없습니다.'));
            return;
        }

        console.log(chalk.bold('\n📋 마스터 MCP 서버 목록:\n'));
        for (const [name, server] of servers) {
            console.log(chalk.cyan(`  ${name}`));
            console.log(`    Command: ${server.command}`);
            console.log(`    Args: ${server.args.join(' ')}`);
            if (server.description) {
                console.log(`    Description: ${server.description}`);
            }
            if (server.category) {
                console.log(`    Category: ${server.category}`);
            }
            console.log('');
        }
    });

// acs mcp add
mcpCommand
    .command('add [name]')
    .description('마스터 MCP 서버 추가')
    .option('--command <command>', '실행 명령어')
    .option('--args <args>', '인자 (공백으로 구분)', '')
    .option('--description <desc>', '설명')
    .option('--category <category>', '카테고리')
    .action(async (name: string | undefined, options: any) => {
        const inquirer = (await import('inquirer')).default;

        // 인터랙티브 프롬프트
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'name',
                message: 'MCP 서버 이름:',
                when: !name,
                validate: (input: string) => input.trim() ? true : '이름을 입력하세요',
            },
            {
                type: 'input',
                name: 'command',
                message: '실행 명령어 (예: npx, node):',
                when: !options.command,
                validate: (input: string) => input.trim() ? true : '명령어를 입력하세요',
            },
            {
                type: 'input',
                name: 'args',
                message: '인자 (공백으로 구분):',
                when: !options.args,
            },
            {
                type: 'input',
                name: 'description',
                message: '설명 (선택):',
                when: !options.description,
            },
            {
                type: 'input',
                name: 'category',
                message: '카테고리 (선택):',
                when: !options.category,
            },
        ]);

        const serverName = name || answers.name;
        const config = loadMasterMcp();

        const server: McpServer = {
            command: options.command || answers.command,
            args: (options.args || answers.args || '').split(' ').filter((a: string) => a),
        };

        const description = options.description || answers.description;
        const category = options.category || answers.category;

        if (description) {
            server.description = description;
        }
        if (category) {
            server.category = category;
        }

        config.mcpServers[serverName] = server;
        await saveMasterMcp(config);

        console.log(chalk.green(`✓ MCP 서버 '${serverName}' 추가됨`));
    });

// acs mcp remove
mcpCommand
    .command('remove <name>')
    .alias('rm')
    .description('마스터 MCP 서버 삭제')
    .action(async (name: string) => {
        const config = loadMasterMcp();

        if (!config.mcpServers[name]) {
            console.log(chalk.red(`✖ MCP 서버 '${name}'를 찾을 수 없습니다.`));
            return;
        }

        delete config.mcpServers[name];
        await saveMasterMcp(config);

        console.log(chalk.green(`✓ MCP 서버 '${name}' 삭제됨`));
    });
