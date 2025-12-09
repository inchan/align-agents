import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';

export class ConfigController {
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
