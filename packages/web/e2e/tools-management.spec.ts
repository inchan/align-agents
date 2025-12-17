import { test, expect } from '@playwright/test'
import { TIMEOUTS, expectToast, generateUniqueName } from './tools/tools.helpers'

test.describe('Tools Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to Tools page
        await page.goto('/tools')
        // Wait for hydration/loading
        await page.waitForTimeout(1000)
    })

    test('should display tools page structure', async ({ page }) => {
        // Just verify the header exists, don't enforce card count > 0 as it might be empty
        await expect(page.getByRole('heading', { name: '도구 관리' })).toBeVisible()
    })

    test('should add and delete a custom tool', async ({ page }) => {
        const toolName = generateUniqueName('Custom Tool')

        // 1. Add Tool
        await page.getByRole('button', { name: 'Add Tool' }).click()

        const modal = page.locator('div[role="dialog"]').first()
        await expect(modal).toBeVisible()

        // Use more specific selectors or wait
        await modal.locator('input').first().fill(toolName)
        await modal.locator('input').nth(1).fill('/tmp/config.json')

        await modal.getByRole('button', { name: 'Add Tool' }).click()

        // Wait for toast or card
        await expectToast(page, /Tool added|Success/i)

        // Wait for card to appear
        const card = page.locator('.card').filter({ hasText: toolName }).first()
        await expect(card).toBeVisible({ timeout: TIMEOUTS.medium })

        // 2. Delete Tool (Clean up)
        // Ensure menu button is visible (hover if needed, but click works on overlay often)
        const menuBtn = card.locator('button:has(svg.lucide-more-vertical)')
        await menuBtn.click()

        const deleteItem = page.getByRole('menuitem', { name: 'Delete' })
        await expect(deleteItem).toBeVisible()
        await deleteItem.click()

        await expectToast(page, /Tool deleted|Success/i)
        await expect(card).not.toBeVisible({ timeout: TIMEOUTS.medium })
    })

    // Skip help check test as it relies on installed tools which may not exist
})
