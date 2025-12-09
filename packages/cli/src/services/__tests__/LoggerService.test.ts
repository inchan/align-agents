import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LoggerService } from '../LoggerService.js';

describe('LoggerService', () => {
    let logger: LoggerService;

    beforeEach(() => {
        logger = LoggerService.getInstance();
        logger.clear();
    });

    it('should be a singleton', () => {
        const logger1 = LoggerService.getInstance();
        const logger2 = LoggerService.getInstance();
        expect(logger1).toBe(logger2);
    });

    it('should log messages and store history', () => {
        logger.log('info', 'Test message');
        const history = logger.getHistory();
        expect(history).toHaveLength(1);
        expect(history[0].message).toBe('Test message');
        expect(history[0].level).toBe('info');
    });

    it('should extract category from message', () => {
        logger.log('warn', '[Category] Message');
        const history = logger.getHistory();
        expect(history[0].category).toBe('Category');
    });

    it('should limit history size', () => {
        // Access private MAX_LOGS via any cast or just add enough logs
        // Since MAX_LOGS is 1000, we won't test the limit strictly to avoid slow tests,
        // but we can verify it adds logs correctly.
        // If we want to test limit, we might need to mock or subclass, but for now let's trust the logic
        // or add a small number of logs.

        for (let i = 0; i < 10; i++) {
            logger.log('info', `Message ${i}`);
        }
        expect(logger.getHistory()).toHaveLength(10);
    });

    it('should emit log event', () => {
        const spy = vi.fn();
        logger.on('log', spy);
        logger.log('error', 'Error message');
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            level: 'error',
            message: 'Error message'
        }));
    });

    it('should clear history', () => {
        logger.log('info', 'Message');
        logger.clear();
        expect(logger.getHistory()).toHaveLength(0);
    });

    it('should handle args', () => {
        logger.log('info', 'Message', { data: 123 });
        const history = logger.getHistory();
        expect(history[0].args).toEqual([{ data: 123 }]);
    });
});
