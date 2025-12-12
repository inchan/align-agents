import { test, expect } from '@playwright/test';
import { navigateToDashboardPage, SELECTORS, MOCK_DATA, MOCK_DATA_EMPTY } from './dashboard.helpers';

test.describe('Dashboard Core - P0', () => {
    // Setup default mocks for all tests
    test.beforeEach(async ({ page }) => {
        await page.route('**/api/stats/summary', async route => await route.fulfill({ json: MOCK_DATA.stats }));
        await page.route('**/api/tools', async route => await route.fulfill({ json: MOCK_DATA.tools }));
        await page.route('**/api/stats/activity', async route => await route.fulfill({ json: MOCK_DATA.activities }));
    });

    test('D-001: should display loading state', async ({ page }) => {
        // Override the stats route with a delay for this specific test to force loading state
        await page.route('**/api/stats/summary', async route => {
            await new Promise(resolve => setTimeout(resolve, 1000));
            await route.fulfill({ json: MOCK_DATA.stats });
        });

        // Navigate without waiting for networkidle to catch the loading state immediately
        await page.goto('/');

        // Verify loading skeletons are visible
        await expect(page.locator(SELECTORS.loadingSkeleton).first()).toBeVisible();

        // Verify loading eventually completes
        await expect(page.locator(SELECTORS.loadingSkeleton).first()).not.toBeVisible({ timeout: 10000 });
    });

    test.describe('Content Checks', () => {
        test.beforeEach(async ({ page }) => {
            await navigateToDashboardPage(page);
        });

        test('D-002: should display Stats cards with correct data', async ({ page }) => {
            await expect(page.locator(SELECTORS.statsCard)).toHaveCount(4);

            const titles = ['Total Syncs', 'Success Rate', 'Last Sync', 'Errors'];
            for (const title of titles) {
                await expect(page.locator(SELECTORS.statsCard).filter({ hasText: title })).toBeVisible();
            }

            // Verify specific data from mock
            await expect(page.locator(SELECTORS.statsCard).filter({ hasText: '150' })).toBeVisible();
            await expect(page.locator(SELECTORS.statsCard).filter({ hasText: '93%' })).toBeVisible();
        });

        test('D-003: should display Tool status grid', async ({ page }) => {
            await expect(page.locator(SELECTORS.toolGrid)).toBeVisible();
            await expect(page.locator(SELECTORS.toolCard)).toHaveCount(MOCK_DATA.tools.length);
            await expect(page.locator(SELECTORS.toolCard).filter({ hasText: 'Claude Desktop' })).toBeVisible();
        });

        test('D-004: should display Activity Feed', async ({ page }) => {
            await expect(page.locator(SELECTORS.activityFeed)).toBeVisible();
            await expect(page.locator(SELECTORS.activityFeed).getByText('Recent Activity')).toBeVisible();
            await expect(page.locator(SELECTORS.activityFeed).getByText('Sync started')).toBeVisible();
        });

        test('D-005: should handle interactions (navigation)', async ({ page }) => {
            // Test Manage button for Claude Desktop
            const toolCard = page.locator(SELECTORS.toolCard).filter({ hasText: 'Claude Desktop' });

            // Verify Manage link
            const manageLink = toolCard.getByRole('link', { name: 'Manage' });
            await expect(manageLink).toBeVisible();
            await expect(manageLink).toHaveAttribute('href', '#/tools');

            // Verify MCP link (only exists for Claude Desktop in our code logic)
            const mcpLink = toolCard.getByRole('link', { name: 'MCP' });
            if (await mcpLink.count() > 0) {
                await expect(mcpLink).toBeVisible();
                await expect(mcpLink).toHaveAttribute('href', '#/mcp');
            }
        });
    });

    test.describe('Edge Cases (Empty States)', () => {
        test.beforeEach(async ({ page }) => {
            // Override mocks with empty data
            await page.route('**/api/stats/summary', async route => await route.fulfill({ json: MOCK_DATA_EMPTY.stats }));
            await page.route('**/api/tools', async route => await route.fulfill({ json: MOCK_DATA_EMPTY.tools }));
            await page.route('**/api/stats/activity', async route => await route.fulfill({ json: MOCK_DATA_EMPTY.activities }));

            await navigateToDashboardPage(page);
        });

        test('E-001: should handle empty stats', async ({ page }) => {
            // StatsCards value is in .text-2xl
            // Check for "0" in the value div
            // Total Syncs is 0, Errors is 0. So we expect 2.
            await expect(page.locator(SELECTORS.statsCard).locator('.text-2xl').filter({ hasText: /^0$/ })).toHaveCount(2);

            // Last Sync should say "Never"
            await expect(page.locator(SELECTORS.statsCard).filter({ hasText: 'Never' })).toBeVisible();
        });

        test('E-002: should handle no tools', async ({ page }) => {
            await expect(page.locator(SELECTORS.toolGrid)).toBeVisible();
            await expect(page.locator(SELECTORS.toolCard)).toHaveCount(0);
            await expect(page.locator(SELECTORS.toolGrid)).toContainText('No tools configured');
        });

        test('E-003: should handle empty activity feed', async ({ page }) => {
            await expect(page.locator(SELECTORS.activityFeed)).toBeVisible();
            await expect(page.locator(SELECTORS.activityFeed).getByText('No recent activity')).toBeVisible();
        });
    });
});
