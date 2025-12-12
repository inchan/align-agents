import { Page, expect } from '@playwright/test'

export const SELECTORS = {
    // Tool Set (Left Column)
    toolSetColumn: 'h3:has-text("Target Tools")',
    toolSetCard: (name: string) => `.group:has-text("${name}")`,
    createToolSetButton: 'h3:has-text("Target Tools") ~ button', // "Target Tools" 헤더 옆의 + 버튼
    activeToolSet: '.group.border-primary',

    // Rules (Middle Column)
    rulesColumn: 'h3:has-text("Rules Source")',
    ruleCard: (name: string) => `.group:has-text("${name}")`,
    activeRule: '.group.border-primary',

    // MCP (Right Column)
    mcpColumn: 'h3:has-text("MCP Server Set")',
    mcpSetCard: (name: string) => `.group:has-text("${name}")`,
    activeMcpSet: '.group.border-primary',

    // Header Controls (Global Sync Button)
    // Header에 있는 Sync 버튼 (Sync Now 또는 Syncing...)
    syncButton: 'header button:has-text("Sync")',
    
    // Dialogs
    dialog: '[role="dialog"]',
    dialogSaveButton: 'button:has-text("Create Set")',
    nameInput: 'input[id="name"]',
    descriptionInput: 'textarea[id="description"]',
    
    // Toast
    toast: '[data-sonner-toast], [role="status"]',
    
    // Delete Action
    deleteButton: 'button:has(.lucide-trash-2)',
} as const

export const TIMEOUTS = { short: 3000, medium: 5000, long: 10000 } as const

export async function navigateToSyncPage(page: Page): Promise<void> {
    await page.goto('/sync')
    await page.waitForLoadState('networkidle')
    // 주요 컬럼이 로드될 때까지 대기
    await expect(page.locator(SELECTORS.toolSetColumn)).toBeVisible()
}

export async function selectToolSet(page: Page, setName: string): Promise<void> {
    const card = page.locator(SELECTORS.toolSetCard(setName)).first()
    await card.click()
    // 선택된 상태(border-primary) 확인
    await expect(card).toHaveClass(/border-primary/)
}

export async function createToolSet(page: Page, name: string, description: string, toolIds: string[]): Promise<void> {
    await page.locator(SELECTORS.createToolSetButton).click()
    await expect(page.locator(SELECTORS.dialog)).toBeVisible()
    
    await page.fill(SELECTORS.nameInput, name)
    await page.fill(SELECTORS.descriptionInput, description)
    
    // 툴 선택 (체크박스)
    for (const toolId of toolIds) {
        const checkbox = page.locator(`button[id="tool-${toolId}"]`)
        if (await checkbox.getAttribute('aria-checked') === 'false') {
            await checkbox.click()
        }
    }
    
    await page.click(SELECTORS.dialogSaveButton)
    await expect(page.locator(SELECTORS.dialog)).toBeHidden()
}

export async function deleteToolSet(page: Page, setName: string): Promise<void> {
    const card = page.locator(SELECTORS.toolSetCard(setName)).first()
    await card.hover()
    
    // 삭제 버튼 클릭 및 컨펌 다이얼로그 처리
    page.once('dialog', dialog => dialog.accept())
    await card.locator(SELECTORS.deleteButton).click()
}

export async function selectRules(page: Page, ruleName: string): Promise<void> {
    const card = page.locator(SELECTORS.ruleCard(ruleName)).first()
    await card.click()
    await expect(card).toHaveClass(/border-primary/)
}

export async function selectMcpSet(page: Page, setName: string): Promise<void> {
    const card = page.locator(SELECTORS.mcpSetCard(setName)).first()
    await card.click()
    await expect(card).toHaveClass(/border-primary/)
}

export async function executeSyncAction(page: Page): Promise<void> {
    const btn = page.locator(SELECTORS.syncButton)
    await expect(btn).toBeEnabled()
    await btn.click()
}