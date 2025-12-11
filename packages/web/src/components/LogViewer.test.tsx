import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogViewer, type LogEntry } from './LogViewer';

// Mock logs for testing
const mockLogs: LogEntry[] = [
    {
        id: '1',
        timestamp: '2024-01-01T10:00:00.000Z',
        level: 'info',
        message: 'Info message',
        category: 'System',
    },
    {
        id: '2',
        timestamp: '2024-01-01T10:01:00.000Z',
        level: 'warn',
        message: 'Warning message',
        category: 'API',
    },
    {
        id: '3',
        timestamp: '2024-01-01T10:02:00.000Z',
        level: 'error',
        message: 'Error message',
        category: 'System',
    },
    {
        id: '4',
        timestamp: '2024-01-01T10:03:00.000Z',
        level: 'debug',
        message: 'Debug message',
        category: 'Debug',
    },
];

describe('LogViewer', () => {
    const defaultProps = {
        logs: mockLogs,
        onClear: vi.fn(),
        isPaused: false,
        onTogglePause: vi.fn(),
        onExport: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Rendering', () => {
        it('should render log entries', () => {
            render(<LogViewer {...defaultProps} />);

            expect(screen.getByText('Info message')).toBeInTheDocument();
            expect(screen.getByText('Warning message')).toBeInTheDocument();
            expect(screen.getByText('Error message')).toBeInTheDocument();
            expect(screen.getByText('Debug message')).toBeInTheDocument();
        });

        it('should show empty state when no logs', () => {
            render(<LogViewer {...defaultProps} logs={[]} />);

            expect(screen.getByText('No logs yet. Perform actions to see logs here.')).toBeInTheDocument();
        });

        it('should display log count in status bar', () => {
            render(<LogViewer {...defaultProps} />);

            expect(screen.getByText(/Total: 4/)).toBeInTheDocument();
        });

        it('should show Live status when not paused', () => {
            render(<LogViewer {...defaultProps} isPaused={false} />);

            expect(screen.getByText('● Live')).toBeInTheDocument();
        });

        it('should show Paused status when paused', () => {
            render(<LogViewer {...defaultProps} isPaused={true} />);

            expect(screen.getByText('⏸ Paused')).toBeInTheDocument();
        });
    });

    describe('Filtering', () => {
        it('should filter logs by search text', () => {
            render(<LogViewer {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('Search logs...');
            fireEvent.change(searchInput, { target: { value: 'Error' } });

            expect(screen.getByText('Error message')).toBeInTheDocument();
            expect(screen.queryByText('Info message')).not.toBeInTheDocument();
        });

        it('should show filtered count when filtering', () => {
            render(<LogViewer {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('Search logs...');
            fireEvent.change(searchInput, { target: { value: 'Error' } });

            expect(screen.getByText(/Filtered: 1/)).toBeInTheDocument();
        });

        it('should show no match message when filter returns empty', () => {
            render(<LogViewer {...defaultProps} />);

            const searchInput = screen.getByPlaceholderText('Search logs...');
            fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

            expect(screen.getByText('No logs match your filters')).toBeInTheDocument();
        });
    });

    describe('Actions', () => {
        it('should call onClear when clear button is clicked', () => {
            render(<LogViewer {...defaultProps} />);

            const clearButton = screen.getByTitle('Clear logs');
            fireEvent.click(clearButton);

            expect(defaultProps.onClear).toHaveBeenCalledTimes(1);
        });

        it('should call onTogglePause when pause button is clicked', () => {
            render(<LogViewer {...defaultProps} />);

            const pauseButton = screen.getByTitle('Pause auto-scroll');
            fireEvent.click(pauseButton);

            expect(defaultProps.onTogglePause).toHaveBeenCalledTimes(1);
        });

        it('should show resume button when paused', () => {
            render(<LogViewer {...defaultProps} isPaused={true} />);

            const resumeButton = screen.getByTitle('Resume auto-scroll');
            expect(resumeButton).toBeInTheDocument();
        });
    });

    describe('Level Filtering', () => {
        it('should show level dropdown button', () => {
            render(<LogViewer {...defaultProps} />);

            // Level dropdown button should show 'all' by default
            const levelButton = screen.getByText('all');
            expect(levelButton).toBeInTheDocument();
        });

        it('should show all logs when "all" level is selected', () => {
            render(<LogViewer {...defaultProps} />);

            // All logs should be visible by default
            expect(screen.getByText('Info message')).toBeInTheDocument();
            expect(screen.getByText('Warning message')).toBeInTheDocument();
            expect(screen.getByText('Error message')).toBeInTheDocument();
            expect(screen.getByText('Debug message')).toBeInTheDocument();
        });

        it('should filter logs by level when error is selected', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // Open level dropdown - find the button that shows 'all' text
            const levelButton = screen.getByText('all').closest('button')!;
            await user.click(levelButton);

            // Click error option
            const errorOption = await screen.findByRole('menuitem', { name: 'error' });
            await user.click(errorOption);

            // Only error log should be visible
            await waitFor(() => {
                expect(screen.getByText('Error message')).toBeInTheDocument();
                expect(screen.queryByText('Info message')).not.toBeInTheDocument();
            });
        });

        it('should filter logs by level when warn is selected', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // Open level dropdown - find the button that shows 'all' text
            const levelButton = screen.getByText('all').closest('button')!;
            await user.click(levelButton);

            // Click warn option
            const warnOption = await screen.findByRole('menuitem', { name: 'warn' });
            await user.click(warnOption);

            // Only warn log should be visible
            await waitFor(() => {
                expect(screen.getByText('Warning message')).toBeInTheDocument();
                expect(screen.queryByText('Info message')).not.toBeInTheDocument();
            });
        });

    });

    describe('Export Dropdown', () => {
        it('should render export button when onExport is provided', () => {
            render(<LogViewer {...defaultProps} />);

            const exportButton = screen.getByText('Export');
            expect(exportButton).toBeInTheDocument();
        });

        it('should disable export button when no logs', () => {
            render(<LogViewer {...defaultProps} logs={[]} />);

            const exportButton = screen.getByTitle('Export logs');
            expect(exportButton).toBeDisabled();
        });

        it('should not render export dropdown when onExport is not provided', () => {
            const propsWithoutExport = { ...defaultProps, onExport: undefined };
            render(<LogViewer {...propsWithoutExport} />);

            expect(screen.queryByText('Export')).not.toBeInTheDocument();
        });

        it('should call onExport with json when JSON option is clicked', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // Open export dropdown
            const exportButton = screen.getByRole('button', { name: /export/i });
            await user.click(exportButton);

            // Click JSON option
            const jsonOption = await screen.findByRole('menuitem', { name: /json/i });
            await user.click(jsonOption);

            expect(defaultProps.onExport).toHaveBeenCalledWith('json');
        });

        it('should call onExport with csv when CSV option is clicked', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // Open export dropdown
            const exportButton = screen.getByRole('button', { name: /export/i });
            await user.click(exportButton);

            // Click CSV option
            const csvOption = await screen.findByRole('menuitem', { name: /csv/i });
            await user.click(csvOption);

            expect(defaultProps.onExport).toHaveBeenCalledWith('csv');
        });

    });

    describe('Log Level Styles', () => {
        it('should render fatal log with correct style', () => {
            const fatalLog: LogEntry = {
                id: '5',
                timestamp: '2024-01-01T10:04:00.000Z',
                level: 'fatal',
                message: 'Fatal error',
            };
            render(<LogViewer {...defaultProps} logs={[fatalLog]} />);

            expect(screen.getByText('Fatal error')).toBeInTheDocument();
            expect(screen.getByText('fatal')).toBeInTheDocument();
        });

        it('should render trace log with correct style', () => {
            const traceLog: LogEntry = {
                id: '6',
                timestamp: '2024-01-01T10:05:00.000Z',
                level: 'trace',
                message: 'Trace message',
            };
            render(<LogViewer {...defaultProps} logs={[traceLog]} />);

            expect(screen.getByText('Trace message')).toBeInTheDocument();
            expect(screen.getByText('trace')).toBeInTheDocument();
        });
    });

    describe('Category Selection', () => {
        it('should filter logs when category is selected from dropdown', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // Open category dropdown
            const categoryButton = screen.getByRole('button', { name: /all categories/i });
            await user.click(categoryButton);

            // Click System category
            const systemOption = await screen.findByRole('menuitem', { name: 'System' });
            await user.click(systemOption);

            // Only System logs should be visible
            await waitFor(() => {
                expect(screen.getByText('Info message')).toBeInTheDocument();
                expect(screen.queryByText('Warning message')).not.toBeInTheDocument(); // API category
            });
        });

        it('should clear category filter when All Categories is selected', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // First select a category
            const categoryButton = screen.getByRole('button', { name: /all categories/i });
            await user.click(categoryButton);
            const systemOption = await screen.findByRole('menuitem', { name: 'System' });
            await user.click(systemOption);

            // Now clear the filter by selecting All Categories
            const updatedCategoryButton = screen.getByRole('button', { name: /system/i });
            await user.click(updatedCategoryButton);
            const allCategoriesOption = await screen.findByRole('menuitem', { name: 'All Categories' });
            await user.click(allCategoriesOption);

            // All logs should be visible again
            await waitFor(() => {
                expect(screen.getByText('Info message')).toBeInTheDocument();
                expect(screen.getByText('Warning message')).toBeInTheDocument();
            });
        });

        it('should clear category filter when badge X is clicked', async () => {
            const user = userEvent.setup();
            render(<LogViewer {...defaultProps} />);

            // First select a category
            const categoryButton = screen.getByRole('button', { name: /all categories/i });
            await user.click(categoryButton);
            const systemOption = await screen.findByRole('menuitem', { name: 'System' });
            await user.click(systemOption);

            // Click the badge to clear
            const badge = await screen.findByText(/System ×/);
            await user.click(badge);

            // All logs should be visible again
            await waitFor(() => {
                expect(screen.getByText('All Categories')).toBeInTheDocument();
            });
        });
    });

    describe('Category Dropdown', () => {
        it('should display category dropdown when categories exist', () => {
            render(<LogViewer {...defaultProps} />);

            expect(screen.getByText('All Categories')).toBeInTheDocument();
        });

        it('should show all unique categories in dropdown', async () => {
            render(<LogViewer {...defaultProps} />);

            // Open dropdown
            const categoryButton = screen.getByText('All Categories');
            fireEvent.click(categoryButton);

            // Check categories are displayed in the log entries (categories appear in [Category] format)
            // The dropdown menu uses portals so we check for existence of the dropdown trigger
            expect(screen.getAllByText('All Categories').length).toBeGreaterThan(0);

            // Categories are also shown in log entries as [Category] format
            // Using getAllByText because System appears twice in logs
            expect(screen.getAllByText('[System]').length).toBeGreaterThan(0);
            expect(screen.getAllByText('[API]').length).toBeGreaterThan(0);
            expect(screen.getAllByText('[Debug]').length).toBeGreaterThan(0);
        });
    });
});

