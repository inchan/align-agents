import { Request, Response } from 'express';
import { scanForTools, ProjectScanner, TOOL_METADATA } from '@align-agents/cli';

/**
 * AI 도구 메타데이터 및 스캔 컨트롤러
 */
export class ToolsController {
    /**
     * 지원되는 모든 도구의 메타데이터를 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns ToolMetadata 배열
     * @throws 500 - 조회 실패
     */
    async getMetadata(req: Request, res: Response) {
        try {
            res.json(TOOL_METADATA);
        } catch (error) {
            console.error('Error getting tool metadata:', error);
            res.status(500).json({ error: 'Failed to get tool metadata' });
        }
    }

    /**
     * 설치된 AI 도구 목록을 스캔하여 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns ToolConfig 배열 (id, name, configPath, exists)
     * @throws 500 - 스캔 실패
     */
    async list(req: Request, res: Response) {
        try {
            const tools = await scanForTools();
            res.json(tools);
        } catch (error) {
            console.error('Error scanning tools:', error);
            res.status(500).json({ error: 'Failed to scan tools' });
        }
    }

    /**
     * 설치된 AI 도구 목록을 스캔한다. (list의 별칭)
     * @param req - Express Request
     * @param res - Express Response
     * @returns ToolConfig 배열
     */
    async scan(req: Request, res: Response) {
        return this.list(req, res);
    }

    /**
     * 최근 사용한 프로젝트 목록을 조회한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns ProjectInfo 배열
     * @throws 500 - 조회 실패
     */
    async getRecentProjects(req: Request, res: Response) {
        try {
            const scanner = new ProjectScanner();
            const projects = await scanner.getAllRecentProjects();
            res.json(projects);
        } catch (error) {
            console.error('Error getting recent projects:', error);
            res.status(500).json({ error: 'Failed to get recent projects' });
        }
    }

    /**
     * macOS 폴더 선택 다이얼로그를 표시한다.
     * @param req - Express Request
     * @param res - Express Response
     * @returns { path: string } 또는 { path: null, cancelled: true }
     * @throws 500 - 다이얼로그 실행 실패
     */
    async pickFolder(req: Request, res: Response) {
        try {
            const { exec } = await import('child_process');

            // macOS specific folder picker
            const command = `osascript -e 'POSIX path of (choose folder with prompt "Select Project Folder")'`;

            exec(command, (error, stdout, stderr) => {
                if (error) {
                    // User cancelled or error
                    if (stderr.includes('User canceled')) {
                        return res.json({ path: null, cancelled: true });
                    }
                    console.error('Error picking folder:', error);
                    return res.status(500).json({ error: 'Failed to pick folder' });
                }

                const path = stdout.trim();
                res.json({ path });
            });
        } catch (error) {
            console.error('Error in pick folder:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
