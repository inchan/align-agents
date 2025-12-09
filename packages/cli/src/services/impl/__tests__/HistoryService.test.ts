import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HistoryService } from '../HistoryService.js';
import { IFileSystem } from '../../../interfaces/IFileSystem.js';

describe('HistoryService', () => {
    let service: HistoryService;
    let mockFs: IFileSystem;
    const { mockHomeDir } = vi.hoisted(() => ({
        mockHomeDir: '/mock/home',
    }));

    beforeEach(() => {
        vi.mock('os', () => ({
            default: {
                homedir: () => mockHomeDir,
            },
        }));

        mockFs = {
            join: vi.fn((...args) => args.join('/')),
            exists: vi.fn(),
            mkdir: vi.fn(),
            readFile: vi.fn(),
            writeFile: vi.fn(),
            unlink: vi.fn(),
            relative: vi.fn(),
            dirname: vi.fn(),
            basename: vi.fn(),
        };

        service = new HistoryService(mockFs);
    });

    it('should save version and update index', () => {
        vi.mocked(mockFs.exists).mockReturnValue(false);

        const id = service.saveVersion('rules', 'content', 'desc');

        expect(mockFs.mkdir).toHaveBeenCalledWith(`${mockHomeDir}/.config/ai-cli-syncer/history`);
        expect(mockFs.writeFile).toHaveBeenCalledTimes(2); // content file + index file
        expect(id).toContain('rules-');
    });

    it('should load history from index file', () => {
        const mockIndex = [
            { id: '1', timestamp: '2023-01-01', type: 'rules', description: 'desc' }
        ];
        vi.mocked(mockFs.exists).mockReturnValue(true);
        vi.mocked(mockFs.readFile).mockReturnValue(JSON.stringify(mockIndex));

        const history = service.getHistory();

        expect(history).toHaveLength(1);
        expect(history[0].id).toBe('1');
    });

    it('should return empty array if index file does not exist', () => {
        vi.mocked(mockFs.exists).mockReturnValue(false);

        const history = service.getHistory();

        expect(history).toEqual([]);
    });

    it('should limit history to 50 entries', () => {
        const mockIndex = Array(50).fill(null).map((_, i) => ({
            id: i.toString(),
            timestamp: '2023-01-01',
            type: 'rules'
        }));

        vi.mocked(mockFs.exists).mockReturnValue(true);
        vi.mocked(mockFs.readFile).mockReturnValue(JSON.stringify(mockIndex));

        service.saveVersion('rules', 'new content');

        expect(mockFs.unlink).toHaveBeenCalled(); // Should delete old entry
        expect(mockFs.writeFile).toHaveBeenCalled();
    });
});
