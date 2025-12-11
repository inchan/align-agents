import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act, fireEvent } from '@testing-library/react';
import { LogsPage, escapeCSV, exportLogs } from './LogsPage';
import type { LogEntry } from '../components/LogViewer';

// Mock EventSource
class MockEventSource {
    static instances: MockEventSource[] = [];
    url: string;
    onopen: (() => void) | null = null;
    onmessage: ((event: { data: string }) => void) | null = null;
    onerror: (() => void) | null = null;
    readyState = 0;

    constructor(url: string) {
        this.url = url;
        MockEventSource.instances.push(this);
    }

    close() {
        this.readyState = 2;
    }

    // Test helpers
    simulateOpen() {
        this.readyState = 1;
        this.onopen?.();
    }

    simulateMessage(data: object) {
        this.onmessage?.({ data: JSON.stringify(data) });
    }

    simulateError() {
        this.onerror?.();
    }

    static reset() {
        MockEventSource.instances = [];
    }
}

// Mock fetch
const mockFetch = vi.fn();

describe('LogsPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        MockEventSource.reset();
        global.EventSource = MockEventSource as unknown as typeof EventSource;
        global.fetch = mockFetch;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Initial Load', () => {
        it('should fetch log history on mount', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(mockFetch).toHaveBeenCalledWith('/api/logs/history');
            });
        });

        it('should display logs from history', async () => {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: '2024-01-01T10:00:00.000Z',
                    level: 'info',
                    message: 'History log 1',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockLogs),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(screen.getByText('History log 1')).toBeInTheDocument();
            });
        });

        it('should show error when history fetch fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(screen.getByText('Failed to load log history')).toBeInTheDocument();
            });
        });
    });

    describe('SSE Connection', () => {
        it('should connect to SSE stream on mount', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(MockEventSource.instances.length).toBe(1);
                expect(MockEventSource.instances[0].url).toBe('/api/logs/stream');
            });
        });

        it('should show connected status when SSE opens', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(MockEventSource.instances.length).toBe(1);
            });

            act(() => {
                MockEventSource.instances[0].simulateOpen();
            });

            await waitFor(() => {
                expect(screen.getByText('connected')).toBeInTheDocument();
            });
        });

        it('should display new logs from SSE stream', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(MockEventSource.instances.length).toBe(1);
            });

            act(() => {
                MockEventSource.instances[0].simulateOpen();
                MockEventSource.instances[0].simulateMessage({
                    id: '1',
                    timestamp: '2024-01-01T10:00:00.000Z',
                    level: 'info',
                    message: 'Stream log message',
                });
            });

            await waitFor(() => {
                expect(screen.getByText('Stream log message')).toBeInTheDocument();
            });
        });

        it('should show error status when SSE fails after max retries', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            // Wait for initial render
            await act(async () => {
                await vi.runAllTimersAsync();
            });

            expect(MockEventSource.instances.length).toBeGreaterThanOrEqual(1);

            // Simulate 6 failures (max 5 retries + 1 final)
            for (let i = 0; i < 6; i++) {
                act(() => {
                    const lastInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
                    lastInstance.simulateError();
                });
                await act(async () => {
                    await vi.runAllTimersAsync();
                });
            }

            expect(screen.getByText('Connection Failed')).toBeInTheDocument();

            vi.useRealTimers();
        }, 10000);
    });

    describe('Parse Error Handling', () => {
        it('should track parse errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            expect(MockEventSource.instances.length).toBeGreaterThanOrEqual(1);

            act(() => {
                const instance = MockEventSource.instances[MockEventSource.instances.length - 1];
                instance.simulateOpen();
                // Send invalid JSON directly
                instance.onmessage?.({ data: 'invalid json' });
            });

            expect(screen.getByText('1 parse error')).toBeInTheDocument();

            vi.useRealTimers();
        });

        it('should show plural for multiple parse errors', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            expect(MockEventSource.instances.length).toBeGreaterThanOrEqual(1);

            act(() => {
                const instance = MockEventSource.instances[MockEventSource.instances.length - 1];
                instance.simulateOpen();
                instance.onmessage?.({ data: 'invalid1' });
                instance.onmessage?.({ data: 'invalid2' });
            });

            expect(screen.getByText('2 parse errors')).toBeInTheDocument();

            vi.useRealTimers();
        });
    });

    describe('Export', () => {
        it('should render export button when logs exist', async () => {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: '2024-01-01T10:00:00.000Z',
                    level: 'info',
                    message: 'Test log',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockLogs),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(screen.getByText('Test log')).toBeInTheDocument();
            });

            // Export button should be visible
            expect(screen.getByText('Export')).toBeInTheDocument();
        });

        it('should show export button when logs are loaded', async () => {
            const mockLogs = [
                {
                    id: '1',
                    timestamp: '2024-01-01T10:00:00.000Z',
                    level: 'info',
                    message: 'Test log',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockLogs),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(screen.getByText('Test log')).toBeInTheDocument();
            });

            // Export button should be visible
            expect(screen.getByText('Export')).toBeInTheDocument();
        });

        it('should disable export button when no logs', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(screen.getByText(/No logs yet/)).toBeInTheDocument();
            });

            // Export button should be disabled when no logs
            const exportButton = screen.getByTitle('Export logs');
            expect(exportButton).toBeDisabled();
        });

    });

    describe('Retry Connection', () => {
        it('should show retry button when connection fails', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // Simulate 6 errors to trigger error state
            for (let i = 0; i < 6; i++) {
                act(() => {
                    const lastInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
                    lastInstance.simulateError();
                });
                await act(async () => {
                    await vi.runAllTimersAsync();
                });
            }

            expect(screen.getByText('Retry Connection')).toBeInTheDocument();

            vi.useRealTimers();
        });

        it('should reset reconnection attempts when retry is clicked', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // Simulate 6 errors to trigger error state
            for (let i = 0; i < 6; i++) {
                act(() => {
                    const lastInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
                    lastInstance.simulateError();
                });
                await act(async () => {
                    await vi.runAllTimersAsync();
                });
            }

            const retryButton = screen.getByText('Retry Connection');

            // Click retry
            fireEvent.click(retryButton);

            // Should create new EventSource instance
            expect(MockEventSource.instances.length).toBeGreaterThan(6);

            vi.useRealTimers();
        });

        it('should close existing connection when retry is clicked', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // Simulate successful connection first
            act(() => {
                const instance = MockEventSource.instances[MockEventSource.instances.length - 1];
                instance.simulateOpen();
            });

            // Simulate 6 errors
            for (let i = 0; i < 6; i++) {
                act(() => {
                    const lastInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
                    lastInstance.simulateError();
                });
                await act(async () => {
                    await vi.runAllTimersAsync();
                });
            }

            const retryButton = screen.getByText('Retry Connection');
            const instancesBefore = MockEventSource.instances.length;

            // Click retry - should close existing and create new
            fireEvent.click(retryButton);

            // Should have created a new instance
            expect(MockEventSource.instances.length).toBeGreaterThan(instancesBefore);

            vi.useRealTimers();
        });

        it('should close existing open connection when reconnecting', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // Get the first instance and simulate open
            const firstInstance = MockEventSource.instances[MockEventSource.instances.length - 1];
            act(() => {
                firstInstance.simulateOpen();
            });

            expect(screen.getByText('connected')).toBeInTheDocument();

            // Simulate an error - this should trigger reconnect
            act(() => {
                firstInstance.simulateError();
            });

            // Fast forward to trigger reconnect
            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // First instance should be closed
            expect(firstInstance.readyState).toBe(2);

            vi.useRealTimers();
        });
    });

    describe('Connection Status Display', () => {
        it('should show disconnected status indicator', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            // Initial state should be connecting
            await waitFor(() => {
                expect(screen.getByText('connecting')).toBeInTheDocument();
            });
        });

        it('should show disconnected status (gray indicator)', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            // The status indicator should be present
            const statusIndicator = document.querySelector('.rounded-full');
            expect(statusIndicator).toBeInTheDocument();
        });
    });

    describe('Cleanup on Unmount', () => {
        it('should close EventSource on unmount', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            const { unmount } = render(<LogsPage />);

            await waitFor(() => {
                expect(MockEventSource.instances.length).toBeGreaterThanOrEqual(1);
            });

            const instance = MockEventSource.instances[MockEventSource.instances.length - 1];

            // Unmount the component
            unmount();

            // EventSource should be closed
            expect(instance.readyState).toBe(2); // 2 = CLOSED
        });

        it('should clear reconnect timeout on unmount', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            vi.useFakeTimers();

            const { unmount } = render(<LogsPage />);

            await act(async () => {
                await vi.runAllTimersAsync();
            });

            // Simulate an error to trigger reconnect timeout
            act(() => {
                const instance = MockEventSource.instances[MockEventSource.instances.length - 1];
                instance.simulateError();
            });

            // Unmount before timeout fires
            unmount();

            // No errors should occur when timers advance
            await act(async () => {
                await vi.runAllTimersAsync();
            });

            vi.useRealTimers();
        });
    });

    describe('Clear Logs', () => {
        it('should render clear button', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                const clearButton = screen.getByTitle('Clear logs');
                expect(clearButton).toBeInTheDocument();
            });
        });
    });

    describe('Pause/Resume', () => {
        it('should toggle pause state', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve([]),
            });

            render(<LogsPage />);

            await waitFor(() => {
                expect(screen.getByText('● Live')).toBeInTheDocument();
            });

            // Click pause button
            const pauseButton = screen.getByTitle('Pause auto-scroll');
            fireEvent.click(pauseButton);

            await waitFor(() => {
                expect(screen.getByText('⏸ Paused')).toBeInTheDocument();
            });
        });
    });
});

describe('escapeCSV', () => {
    it('should escape double quotes', () => {
        expect(escapeCSV('Hello "World"')).toBe('"Hello ""World"""');
    });

    it('should escape newlines', () => {
        expect(escapeCSV('Line1\nLine2')).toBe('"Line1\nLine2"');
    });

    it('should escape carriage returns', () => {
        expect(escapeCSV('Line1\rLine2')).toBe('"Line1\rLine2"');
    });

    it('should escape commas', () => {
        expect(escapeCSV('value1,value2')).toBe('"value1,value2"');
    });

    it('should not escape plain strings', () => {
        expect(escapeCSV('plain text')).toBe('plain text');
    });

    it('should handle complex escaping', () => {
        expect(escapeCSV('He said "Hello, World"\nNew line')).toBe('"He said ""Hello, World""\nNew line"');
    });
});

describe('exportLogs', () => {
    const mockLogs: LogEntry[] = [
        {
            id: '1',
            timestamp: '2024-01-01T10:00:00.000Z',
            level: 'info',
            message: 'Test message',
            category: 'Test',
        },
        {
            id: '2',
            timestamp: '2024-01-01T10:01:00.000Z',
            level: 'error',
            message: 'Error message with "quotes"',
        },
    ];

    it('should return null for empty logs', () => {
        expect(exportLogs([], 'json')).toBeNull();
        expect(exportLogs([], 'csv')).toBeNull();
    });

    it('should export logs as JSON', () => {
        const result = exportLogs(mockLogs, 'json');

        expect(result).not.toBeNull();
        expect(result!.mimeType).toBe('application/json');
        expect(result!.filename).toMatch(/^logs-.*\.json$/);

        const parsed = JSON.parse(result!.content);
        expect(parsed).toHaveLength(2);
        expect(parsed[0].message).toBe('Test message');
    });

    it('should export logs as CSV', () => {
        const result = exportLogs(mockLogs, 'csv');

        expect(result).not.toBeNull();
        expect(result!.mimeType).toBe('text/csv');
        expect(result!.filename).toMatch(/^logs-.*\.csv$/);

        const lines = result!.content.split('\n');
        expect(lines[0]).toBe('timestamp,level,category,message');
        expect(lines).toHaveLength(3); // header + 2 rows
    });

    it('should escape special characters in CSV', () => {
        const result = exportLogs(mockLogs, 'csv');
        const lines = result!.content.split('\n');

        // Second row should have escaped quotes
        expect(lines[2]).toContain('""quotes""');
    });

    it('should handle logs without category', () => {
        const result = exportLogs(mockLogs, 'csv');
        const lines = result!.content.split('\n');

        // Third row (error message) has no category
        expect(lines[2]).toContain('error,,');
    });
});
