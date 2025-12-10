import { test, expect } from '@playwright/test';

test('navigation works correctly', async ({ page }) => {
    await page.goto('/');

    // Check initial load (should redirect to /rules or show rules)
    await expect(page).toHaveTitle(/align-agents/);

    // Navigate to Rules
    await page.getByRole('link', { name: 'Rules' }).click();
    await expect(page.getByRole('heading', { name: 'Rules Management' })).toBeVisible();

    // Navigate to MCP Servers
    await page.getByRole('link', { name: 'MCP Servers' }).click();
    await expect(page.getByRole('heading', { name: 'MCP Servers' })).toBeVisible();

    // Navigate to Settings
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
});
