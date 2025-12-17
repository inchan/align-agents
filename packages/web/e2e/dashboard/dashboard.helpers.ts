import { Page } from '@playwright/test';

export const SELECTORS = {
    statsCard: '.stats-card',
    toolGrid: '.tool-grid',
    toolCard: '.tool-card',
    activityFeed: '.activity-feed',
    // Activity items are inside the scrollable area
    activityItem: '.activity-feed .overflow-y-auto .space-y-4 > div',
    loadingSkeleton: '.animate-pulse',
};

export const TIMEOUTS = {
    short: 3000,
    medium: 5000,
    long: 10000,
};

export const MOCK_DATA = {
    stats: {
        totalSyncs: 150,
        successCount: 140,
        errorCount: 10,
        lastSync: new Date().toISOString(),
        historyCount: 150
    },
    tools: [
        { id: 'claude-desktop', name: 'Claude Desktop', exists: true, configPath: '/path/to/claude' },
        { id: 'another-tool', name: 'Another Tool', exists: false, configPath: '/path/to/another' }
    ],
    activities: [
        { level: 'info', message: 'Sync started', timestamp: new Date().toISOString() },
        { level: 'error', message: 'Sync failed', timestamp: new Date().toISOString() }
    ]
};

export const MOCK_DATA_EMPTY = {
    stats: {
        totalSyncs: 0,
        successCount: 0,
        errorCount: 0,
        lastSync: null,
        historyCount: 0
    },
    tools: [],
    activities: []
};

export async function navigateToDashboardPage(page: Page) {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}
