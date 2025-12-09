import { Command } from 'commander';
import chalk from 'chalk';

export const mcpCommand = new Command('mcp')
    .description('[DEPRECATED] 마스터 MCP 서버 관리 (Master 개념 제거로 비활성화)')
    .action(() => {
        console.log(chalk.yellow('\n⚠ 이 명령어는 Master MCP 개념 제거로 인해 비활성화되었습니다.'));
        console.log(chalk.gray('대신 Web UI 또는 API를 통해 MCP Sets를 관리하세요.\n'));
    });
