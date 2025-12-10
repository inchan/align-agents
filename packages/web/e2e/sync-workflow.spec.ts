import { test, expect } from '@playwright/test'
import { TIMEOUTS } from './mcp/mcp.helpers'

test.describe('Sync Workflow E2E', () => {
    test.beforeEach(async ({ page, request }) => {
        const { resetDatabase, seedMcpData } = await import('./mcp/mcp.helpers')

        // 1. Reset DB
        await resetDatabase(request)

        // 2. Seed Data
        await seedMcpData(request, {
            sets: [
                {
                    id: 'seed-set-1',
                    name: 'Seeded MCP Set',
                    isActive: true,
                    items: [
                        { id: 'item-1', serverId: 'seed-server-1' }
                    ]
                }
            ],
            tools: [
                { id: 'seed-server-1', name: 'Seeded Server', command: 'node', args: ['-v'] }
            ]
        })

        await page.goto('http://localhost:5173/sync')
        await page.waitForTimeout(1000)
    })

    test('should display sync dashboard', async ({ page }) => {
        await expect(page.getByText('Target Tools', { exact: false })).toBeVisible()
        await expect(page.getByText('Rules Source', { exact: false })).toBeVisible()
        await expect(page.getByText('MCP Server Set', { exact: false })).toBeVisible()
    })

    test('should select seeded sync targets', async ({ page }) => {
        // 1. Tool Set "All Tools" (Always present)
        const toolSet = page.locator('.group:has-text("All Tools")').first()
        await expect(toolSet).toBeVisible()
        await toolSet.click()
        await expect(toolSet).toHaveClass(/border-primary/)

        // 2. Rule Source (Skipping strict check as we didn't seed Rules yet, potentially next step)

        // 3. MCP Set (We seeded "Seeded MCP Set")
        const mcpColumn = page.locator('h3:has-text("MCP Server Set")').locator('xpath=../..').last()
        const mcpItem = mcpColumn.locator('.group:has-text("Seeded MCP Set")')

        await expect(mcpItem).toBeVisible({ timeout: 5000 })
        await mcpItem.click()
        await expect(mcpItem.getByTestId('check-icon').or(page.locator('.lucide-check'))).toBeVisible()
    })
})
