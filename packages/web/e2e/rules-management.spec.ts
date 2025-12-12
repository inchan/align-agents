import { test, expect } from '@playwright/test'

test.describe('Rules Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to rules page
        await page.goto('/rules')

        // Wait for page to load
        await page.waitForLoadState('networkidle')
    })

    test('should display rules page', async ({ page }) => {
        // Check if Rules header is visible
        await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible()
    })

    test('should create a new rule', async ({ page }) => {
        test('should create a new rule', async ({ page }) => {
            // Click New Rule button (Plus icon)
            // Since it has no text, we find it by being inside the header or by icon class if possible.
            // Or simpler: strictly looking at the structure `div.flex.items-center.gap-1 > Button`
            // Let's use the one in the header.
            await page.locator('.w-80 .flex.items-center.gap-1 button').first().click()

            // Fill in rule details
            await page.fill('input[id="ruleName"]', 'E2E Test Rule')
            await page.fill('textarea[id="ruleContent"]', '# E2E Test Content\n\nThis is a test rule.')

            // Create rule
            await page.getByRole('button', { name: 'Create' }).click()

            // Verify rule appears in list
            await expect(page.getByText('E2E Test Rule')).toBeVisible({ timeout: 5000 })
        })

        test('should activate a rule', async ({ page }) => {
            // Create a rule first
            await page.getByRole('button', { name: 'New Rule' }).click()
            await page.fill('input[id="ruleName"]', 'Rule to Activate')
            await page.fill('textarea[id="ruleContent"]', '# Content')
            await page.getByRole('button', { name: 'Create' }).click()

            // Wait for rule to appear
            await expect(page.getByText('Rule to Activate')).toBeVisible({ timeout: 5000 })

            // Click on the rule
            await page.getByText('Rule to Activate').click()

            // Click Set as Master button (check icon)
            await page.getByRole('button', { name: 'Set as Master' }).click()

            // Verify Master badge appears
            await expect(page.getByText('Master')).toBeVisible({ timeout: 5000 })
        })

        test('should edit rule content', async ({ page }) => {
            // Create a rule
            await page.getByRole('button', { name: 'New Rule' }).click()
            await page.fill('input[id="ruleName"]', 'Rule to Edit')
            await page.fill('textarea[id="ruleContent"]', '# Original Content')
            await page.getByRole('button', { name: 'Create' }).click()

            // Wait for rule to appear and click it
            await expect(page.getByText('Rule to Edit')).toBeVisible({ timeout: 5000 })
            await page.getByText('Rule to Edit').click()

            // Click Edit button
            await page.getByRole('button', { name: 'Edit' }).click()

            // Modify content
            const textarea = page.locator('textarea').last()
            await textarea.clear()
            await textarea.fill('# Modified Content\n\nThis content was edited.')

            // Save changes
            await page.getByRole('button', { name: 'Save' }).click()

            // Verify save success (toast or UI update)
            await expect(page.getByText('Rule saved')).toBeVisible({ timeout: 5000 })
        })

        test('should delete a rule', async ({ page }) => {
            // Create a rule to delete
            await page.getByRole('button', { name: 'New Rule' }).click()
            await page.fill('input[id="ruleName"]', 'Rule to Delete')
            await page.fill('textarea[id="ruleContent"]', '# Delete Me')
            await page.getByRole('button', { name: 'Create' }).click()

            // Wait for rule to appear
            await expect(page.getByText('Rule to Delete')).toBeVisible({ timeout: 5000 })

            // Hover over rule to show delete button
            await page.getByText('Rule to Delete').hover()

            // Click delete button
            await page.getByRole('button', { name: 'Delete' }).click()

            // Confirm deletion in dialog
            await page.getByRole('button', { name: 'Delete', exact: true }).click()

            // Verify rule is removed
            await expect(page.getByText('Rule to Delete')).not.toBeVisible({ timeout: 5000 })
        })

        test.skip('should sync rules to tools', async ({ page }) => {
            // Sync functionality moved to SyncPage
        })

        test.skip('should select specific tools for sync', async ({ page }) => {
            // Sync functionality moved to SyncPage
        })
    })

    test.describe('Rules Page Navigation', () => {
        test('should navigate to rules page from sidebar', async ({ page }) => {
            await page.goto('/')

            // Click Rules in sidebar
            await page.getByRole('link', { name: 'Rules' }).click()

            // Verify we're on rules page
            await expect(page).toHaveURL(/\/rules/)
            await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible()
        })
    })
})

