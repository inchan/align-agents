import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

/**
 * 설정 파일 읽기/쓰기 컨트롤러
 */
export class ConfigController {
    /**
     * 지정된 경로의 설정 파일 내용을 조회한다.
     * @param req - Express Request (query.path: 설정 파일 경로)
     * @param res - Express Response
     * @returns 설정 파일 내용 ({ content: string }) 또는 에러 응답
     * @throws 400 - path 파라미터 누락
     * @throws 404 - 파일 없음
     * @throws 500 - 파일 읽기 실패
     */
    async getConfig(req: Request, res: Response) {
        try {
            const configPath = req.query.path as string;
            if (!configPath) {
                return res.status(400).json({ error: 'Path is required' });
            }

            // 파일 존재 여부 확인
            try {
                await fs.access(configPath);
            } catch {
                return res.status(404).json({ error: 'File not found' });
            }

            const content = await fs.readFile(configPath, 'utf-8');
            res.json({ content });
        } catch (error: any) {
            console.error('Error reading config:', error);
            res.status(500).json({ error: `Failed to read config: ${error.message}` });
        }
    }

    /**
     * 지정된 경로의 설정 파일에 내용을 저장한다.
     * 기존 파일만 수정 가능하며, 새 파일 생성은 불가.
     * @param req - Express Request (body.path: 파일 경로, body.content: 저장할 내용)
     * @param res - Express Response
     * @returns 성공 시 { success: true }
     * @throws 400 - path 또는 content 누락
     * @throws 404 - 파일 없음
     * @throws 500 - 파일 저장 실패
     */
    async saveConfig(req: Request, res: Response) {
        try {
            const { path: configPath, content } = req.body;
            if (!configPath || content === undefined) {
                return res.status(400).json({ error: 'Path and content are required' });
            }

            // 파일 존재 여부 확인 (기존 파일만 수정 가능하도록)
            try {
                await fs.access(configPath);
            } catch {
                return res.status(404).json({ error: 'File not found' });
            }

            await fs.writeFile(configPath, content, 'utf-8');
            res.json({ success: true });
        } catch (error: any) {
            console.error('Error saving config:', error);
            res.status(500).json({ error: `Failed to save config: ${error.message}` });
        }
    }
}
