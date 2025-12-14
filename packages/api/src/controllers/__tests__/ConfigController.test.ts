import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConfigController } from '../ConfigController.js';

// Mock fs/promises
const mockAccess = vi.fn();
const mockReadFile = vi.fn();
const mockWriteFile = vi.fn();

vi.mock('fs/promises', () => ({
    default: {
        access: (...args: any[]) => mockAccess(...args),
        readFile: (...args: any[]) => mockReadFile(...args),
        writeFile: (...args: any[]) => mockWriteFile(...args),
    },
}));

function createRes() {
    const res: any = {
        statusCode: 200,
        body: undefined as any,
        status(code: number) {
            this.statusCode = code;
            return this;
        },
        json(payload: any) {
            this.body = payload;
            return this;
        },
    };
    return res;
}

describe('ConfigController', () => {
    let controller: ConfigController;

    beforeEach(() => {
        vi.clearAllMocks();
        controller = new ConfigController();
    });

    describe('getConfig', () => {
        it('returns 400 when path is missing', async () => {
            const req = { query: {} } as any;
            const res = createRes();

            await controller.getConfig(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Path is required');
        });

        it('returns 404 when file does not exist', async () => {
            mockAccess.mockRejectedValue(new Error('ENOENT'));

            const req = { query: { path: '/nonexistent/file.json' } } as any;
            const res = createRes();

            await controller.getConfig(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('File not found');
        });

        it('returns file content on success', async () => {
            const fileContent = '{"key": "value"}';
            mockAccess.mockResolvedValue(undefined);
            mockReadFile.mockResolvedValue(fileContent);

            const req = { query: { path: '/path/to/config.json' } } as any;
            const res = createRes();

            await controller.getConfig(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.content).toBe(fileContent);
            expect(mockReadFile).toHaveBeenCalledWith('/path/to/config.json', 'utf-8');
        });

        it('returns 500 when file read fails', async () => {
            mockAccess.mockResolvedValue(undefined);
            mockReadFile.mockRejectedValue(new Error('Read error'));

            const req = { query: { path: '/path/to/config.json' } } as any;
            const res = createRes();

            await controller.getConfig(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toContain('Failed to read config');
        });
    });

    describe('saveConfig', () => {
        it('returns 400 when path is missing', async () => {
            const req = { body: { content: 'some content' } } as any;
            const res = createRes();

            await controller.saveConfig(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Path and content are required');
        });

        it('returns 400 when content is undefined', async () => {
            const req = { body: { path: '/some/path.json' } } as any;
            const res = createRes();

            await controller.saveConfig(req, res);

            expect(res.statusCode).toBe(400);
            expect(res.body.error).toBe('Path and content are required');
        });

        it('returns 404 when file does not exist', async () => {
            mockAccess.mockRejectedValue(new Error('ENOENT'));

            const req = { body: { path: '/nonexistent/file.json', content: 'content' } } as any;
            const res = createRes();

            await controller.saveConfig(req, res);

            expect(res.statusCode).toBe(404);
            expect(res.body.error).toBe('File not found');
        });

        it('saves file content and returns success', async () => {
            mockAccess.mockResolvedValue(undefined);
            mockWriteFile.mockResolvedValue(undefined);

            const req = { body: { path: '/path/to/config.json', content: '{"new": "content"}' } } as any;
            const res = createRes();

            await controller.saveConfig(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
            expect(mockWriteFile).toHaveBeenCalledWith('/path/to/config.json', '{"new": "content"}', 'utf-8');
        });

        it('returns 500 when file write fails', async () => {
            mockAccess.mockResolvedValue(undefined);
            mockWriteFile.mockRejectedValue(new Error('Write error'));

            const req = { body: { path: '/path/to/config.json', content: 'content' } } as any;
            const res = createRes();

            await controller.saveConfig(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.body.error).toContain('Failed to save config');
        });

        it('allows saving empty content', async () => {
            mockAccess.mockResolvedValue(undefined);
            mockWriteFile.mockResolvedValue(undefined);

            const req = { body: { path: '/path/to/config.json', content: '' } } as any;
            const res = createRes();

            await controller.saveConfig(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.body.success).toBe(true);
        });
    });
});
