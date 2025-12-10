import { Request, Response } from 'express';
import { scanForTools, ProjectScanner, TOOL_METADATA } from '@align-agents/cli';

export class ToolsController {
    async getMetadata(req: Request, res: Response) {
        try {
            res.json(TOOL_METADATA);
        } catch (error) {
            console.error('Error getting tool metadata:', error);
            res.status(500).json({ error: 'Failed to get tool metadata' });
        }
    }

    async list(req: Request, res: Response) {
        try {
            const tools = await scanForTools();
            res.json(tools);
        } catch (error) {
            console.error('Error scanning tools:', error);
            res.status(500).json({ error: 'Failed to scan tools' });
        }
    }

    async scan(req: Request, res: Response) {
        return this.list(req, res);
    }

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
