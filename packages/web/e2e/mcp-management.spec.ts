import { test, expect } from '@playwright/test'

test.describe('MCP Management E2E', () => {
    test.beforeEach(async ({ page }) => {
        // Navigate to MCP page
        await page.goto('http://localhost:3000/mcp')
        await page.waitForLoadState('networkidle')
    })

    test('should display MCP page with tabs', async ({ page }) => {
        // Check tabs are visible
        await expect(page.getByRole('tab', { name: /Definitions/i })).toBeVisible()
        await expect(page.getByRole('tab', { name: /Sets/i })).toBeVisible()
    })

    test.describe('MCP Definitions', () => {
        test('should create a new MCP definition', async ({ page }) => {
            // Ensure we're on Definitions tab
            await page.getByRole('tab', { name: /Definitions/i }).click()

            // Click Add Definition button
            await page.getByRole('button', { name: /Add|New|Create/i }).first().click()

            // Fill definition form
            await page.fill('input[name="name"], input[placeholder*="name" i]', 'E2E Test Server')
            await page.fill('input[name="command"], input[placeholder*="command" i]', 'npx')

            // Add args if field exists
            const argsField = page.locator('input[name="args"], input[placeholder*="args" i]')
            if (await argsField.isVisible()) {
                await argsField.fill('-y @test/server')
            }

            // Save definition
            await page.getByRole('button', { name: /Save|Create|Add/i }).click()

            // Verify definition appears
            await expect(page.getByText('E2E Test Server')).toBeVisible({ timeout: 5000 })
        })

        test('should edit MCP definition', async ({ page }) => {
            // Ensure we're on Definitions tab
            await page.getByRole('tab', { name: /Definitions/i }).click()

            // Wait for definitions to load
            await page.waitForTimeout(1000)

            // Click on first definition or create one
            const definitions = page.locator('[data-testid="mcp-definition"], .mcp-definition')
            if (await definitions.count() > 0) {
                await definitions.first().click()

                // Click edit button
                await page.getByRole('button', { name: /Edit/i }).click()

                // Modify command
                const commandField = page.locator('input[name="command"], input[placeholder*="command" i]')
                await commandField.clear()
                await commandField.fill('node')

                // Save
                await page.getByRole('button', { name: /Save|Update/i }).click()

                // Verify update
                await expect(page.getByText('node')).toBeVisible({ timeout: 5000 })
            }
        })

        test('should delete MCP definition', async ({ page }) => {
            // First create a definition to delete
            await page.getByRole('tab', { name: /Definitions/i }).click()
            await page.getByRole('button', { name: /Add|New|Create/i }).first().click()

            await page.fill('input[name="name"], input[placeholder*="name" i]', 'Delete Me Server')
            await page.fill('input[name="command"], input[placeholder*="command" i]', 'echo')
            await page.getByRole('button', { name: /Save|Create|Add/i }).click()

            await expect(page.getByText('Delete Me Server')).toBeVisible({ timeout: 5000 })

            // Click on the definition
            await page.getByText('Delete Me Server').click()

            // Click delete button
            await page.getByRole('button', { name: /Delete/i }).click()

            // Confirm deletion
            await page.getByRole('button', { name: /Delete|Confirm/i, exact: true }).click()

            // Verify deletion
            await expect(page.getByText('Delete Me Server')).not.toBeVisible({ timeout: 5000 })
        })
    })

    test.describe('MCP Sets', () => {
        test('should create a new MCP set', async ({ page }) => {
            // Click on Sets tab
            await page.getByRole('tab', { name: /Sets/i }).click()
            await page.waitForTimeout(500)

            // Click Add Set button
            await page.getByRole('button', { name: /Add|New|Create/i }).first().click()

            // Fill set form
            await page.fill('input[name="name"], input[placeholder*="name" i]', 'E2E Test Set')

            // Add description if field exists
            const descField = page.locator('input[name="description"], textarea[name="description"]')
            if (await descField.isVisible()) {
                await descField.fill('Test set created by E2E tests')
            }

            // Save set
            await page.getByRole('button', { name: /Save|Create|Add/i }).click()

            // Verify set appears
            await expect(page.getByText('E2E Test Set')).toBeVisible({ timeout: 5000 })
        })

        test('should activate MCP set', async ({ page }) => {
            // Click on Sets tab
            await page.getByRole('tab', { name: /Sets/i }).click()
            await page.waitForTimeout(500)

            // Find a set to activate
            const sets = page.locator('[data-testid="mcp-set"], .mcp-set')
            if (await sets.count() > 0) {
                await sets.first().click()

                // Click activate button
                const activateButton = page.getByRole('button', { name: /Activate|Set as Active/i })
                if (await activateButton.isVisible()) {
                    await activateButton.click()

                    // Verify active badge
                    await expect(page.getByText(/Active|Master/i)).toBeVisible({ timeout: 5000 })
                }
            }
        })

        test('should edit MCP set', async ({ page }) => {
            // Click on Sets tab
            await page.getByRole('tab', { name: /Sets/i }).click()
            await page.waitForTimeout(500)

            // Create a set first
            await page.getByRole('button', { name: /Add|New|Create/i }).first().click()
            await page.fill('input[name="name"], input[placeholder*="name" i]', 'Edit Me Set')
            await page.getByRole('button', { name: /Save|Create|Add/i }).click()

            await expect(page.getByText('Edit Me Set')).toBeVisible({ timeout: 5000 })

            // Click on the set
            await page.getByText('Edit Me Set').click()

            // Click edit
            await page.getByRole('button', { name: /Edit/i }).click()

            // Modify name
            const nameField = page.locator('input[name="name"], input[placeholder*="name" i]')
            await nameField.clear()
            await nameField.fill('Edited Set Name')

            // Save
            await page.getByRole('button', { name: /Save|Update/i }).click()

            // Verify update
            await expect(page.getByText('Edited Set Name')).toBeVisible({ timeout: 5000 })
        })

        test('should delete MCP set', async ({ page }) => {
            // Click on Sets tab
            await page.getByRole('tab', { name: /Sets/i }).click()
            await page.waitForTimeout(500)

            // Create a set to delete
            await page.getByRole('button', { name: /Add|New|Create/i }).first().click()
            await page.fill('input[name="name"], input[placeholder*="name" i]', 'Delete Me Set')
            await page.getByRole('button', { name: /Save|Create|Add/i }).click()

            await expect(page.getByText('Delete Me Set')).toBeVisible({ timeout: 5000 })

            // Click on the set
            await page.getByText('Delete Me Set').click()

            // Click delete
            await page.getByRole('button', { name: /Delete/i }).click()

            // Confirm
            await page.getByRole('button', { name: /Delete|Confirm/i, exact: true }).click()

            // Verify deletion
            await expect(page.getByText('Delete Me Set')).not.toBeVisible({ timeout: 5000 })
        })
    })

    test.describe('MCP Sync', () => {
        test('should sync MCP to all tools', async ({ page }) => {
            // Look for sync button
            const syncButton = page.getByRole('button', { name: /Sync/i })

            if (await syncButton.isVisible()) {
                // Select All tools if available
                const allButton = page.getByRole('button', { name: /All/i })
                if (await allButton.isVisible()) {
                    await allButton.click()
                }

                // Click sync
                await syncButton.click()

                // Wait for sync result
                await expect(page.getByText(/Sync|completed|success/i)).toBeVisible({ timeout: 10000 })
            }
        })

        test('should sync specific MCP set', async ({ page }) => {
            // Go to Sets tab
            await page.getByRole('tab', { name: /Sets/i }).click()
            await page.waitForTimeout(500)

            // Find sets
            const sets = page.locator('[data-testid="mcp-set"], .mcp-set')
            if (await sets.count() > 0) {
                // Select first set
                await sets.first().click()

                // Look for sync option
                const syncButton = page.getByRole('button', { name: /Sync/i })
                if (await syncButton.isVisible()) {
                    await syncButton.click()
                    await expect(page.getByText(/Sync|completed|success/i)).toBeVisible({ timeout: 10000 })
                }
            }
        })
    })
})

test.describe('MCP Page Navigation', () => {
    test('should navigate to MCP page from sidebar', async ({ page }) => {
        await page.goto('http://localhost:3000')

        // Click MCP in sidebar (may be "MCP" or "MCP Servers")
        const mcpLink = page.getByRole('link', { name: /MCP/i })
        await mcpLink.click()

        // Verify navigation
        await expect(page).toHaveURL(/.*\/mcp/)
    })

    test('should switch between Definitions and Sets tabs', async ({ page }) => {
        await page.goto('http://localhost:3000/mcp')

        // Click Definitions tab
        await page.getByRole('tab', { name: /Definitions/i }).click()
        await expect(page.getByRole('tab', { name: /Definitions/i })).toHaveAttribute('aria-selected', 'true')

        // Click Sets tab
        await page.getByRole('tab', { name: /Sets/i }).click()
        await expect(page.getByRole('tab', { name: /Sets/i })).toHaveAttribute('aria-selected', 'true')
    })
})
