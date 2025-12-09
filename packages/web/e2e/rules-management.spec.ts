import { test, expect } from '@playwright/test'

test.describe('Rules Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to rules page
        await page.goto('http://localhost:3000/rules')

        // Wait for page to load
        await page.waitForLoadState('networkidle')
    })

    test('should display rules page', async ({ page }) => {
        // Check if sync controls are visible
        await expect(page.getByText('All')).toBeVisible()
        await expect(page.getByText('Sync')).toBeVisible()
        await expect(page.getByText('New Rule')).toBeVisible()
    })

    test('should create a new rule', async ({ page }) => {
        // Click New Rule button
        await page.getByRole('button', { name: 'New Rule' }).click()

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

    test('should sync rules to tools', async ({ page }) => {
        // Create and activate a rule
        await page.getByRole('button', { name: 'New Rule' }).click()
        await page.fill('input[id="ruleName"]', 'Sync Test Rule')
        await page.fill('textarea[id="ruleContent"]', '# Sync Test')
        await page.getByRole('button', { name: 'Create' }).click()

        await expect(page.getByText('Sync Test Rule')).toBeVisible({ timeout: 5000 })
        await page.getByText('Sync Test Rule').click()
        await page.getByRole('button', { name: 'Set as Master' }).click()

        // Select All tools
        await page.getByRole('button', { name: 'All' }).click()

        // Click Sync button
        await page.getByRole('button', { name: 'Sync' }).click()

        // Wait for sync to complete (check for success message or modal)
        await expect(page.getByText(/Sync completed|success/i)).toBeVisible({ timeout: 10000 })
    })

    test('should select specific tools for sync', async ({ page }) => {
        // Check if tool buttons are available
        const cursorButton = page.getByRole('button', { name: 'Cursor' })

        if (await cursorButton.isVisible()) {
            // Click specific tool
            await cursorButton.click()

            // Verify button is selected (has primary styling)
            await expect(cursorButton).toHaveClass(/bg-primary/)

            // Click Sync
            await page.getByRole('button', { name: 'Sync' }).click()

            // Wait for sync result
            await expect(page.getByText(/Sync|success/i)).toBeVisible({ timeout: 10000 })
        }
    })
})

test.describe('Rules Page Navigation', () => {
    test('should navigate to rules page from sidebar', async ({ page }) => {
        await page.goto('http://localhost:3000')

        // Click Rules in sidebar
        await page.getByRole('link', { name: 'Rules' }).click()

        // Verify we're on rules page
        await expect(page).toHaveURL(/.*\/rules/)
        await expect(page.getByText('New Rule')).toBeVisible()
    })
})
