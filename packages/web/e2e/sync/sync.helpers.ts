/**
 * Sync E2E 테스트 헬퍼
 * 공통 셀렉터, 타임아웃, 유틸리티 함수 정의
 *
 * Sync 페이지 구조:
 * - 3컬럼 Kanban 레이아웃
 * - Column 1: Target Tools (Tool Set 목록)
 * - Column 2: Rules Source (Rule 선택)
 * - Column 3: MCP Server Set (MCP Set 선택)
 */
import { Page, expect, APIRequestContext } from '@playwright/test'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 셀렉터 정의
 * SyncPage.tsx의 실제 DOM 구조 기반
 */
export const SELECTORS = {
    // 3컬럼 헤더
    targetToolsHeader: 'h3:has-text("Target Tools")',
    rulesSourceHeader: 'h3:has-text("Rules Source")',
    mcpServerSetHeader: 'h3:has-text("MCP Server Set")',

    // Target Tools 컬럼
    targetToolsColumn: 'div.rounded-xl:has(h3:has-text("Target Tools"))',
    addToolSetButton: 'h3:has-text("Target Tools") ~ div button:has(svg.lucide-plus), div:has(h3:has-text("Target Tools")) button:has(svg.lucide-plus)',
    toolSetItem: (name: string) => `div.group:has-text("${name}")`,
    toolSetDeleteButton: 'button:has(svg.lucide-trash-2)',
    toolSetEyeButton: 'button:has(svg.lucide-eye)',
    toolSetToggleButton: 'button:has(svg.lucide-chevron-down), button:has(svg.lucide-chevron-up)',
    toolSetExpandedArea: 'div.border-t:has-text("Included Tools")',
    toolSetToolCheckbox: (toolName: string) => `label:has-text("${toolName}") ~ input[type="checkbox"], input[type="checkbox"] ~ label:has-text("${toolName}"), div:has(label:has-text("${toolName}")) input[type="checkbox"]`,

    // Rules Source 컬럼
    rulesSourceColumn: 'div.rounded-xl:has(h3:has-text("Rules Source"))',
    ruleItem: (name: string) => `div.group:has-text("${name}")`,
    ruleNoneOption: 'div.rounded-xl:has(h3:has-text("Rules Source")) div.group:has-text("None")',

    // MCP Server Set 컬럼
    mcpServerSetColumn: 'div.rounded-xl:has(h3:has-text("MCP Server Set"))',
    mcpSetItem: (name: string) => `div.group:has-text("${name}")`,
    mcpSetNoneOption: 'div.rounded-xl:has(h3:has-text("MCP Server Set")) div.group:has-text("None")',

    // Create Tool Set 다이얼로그
    createSetDialog: 'div[role="dialog"]:has-text("Create Tool Set")',
    setNameInput: 'div[role="dialog"] input#name',
    setDescriptionInput: 'div[role="dialog"] textarea#description',
    toolCheckbox: (toolId: string) => `div[role="dialog"] input#tool-${toolId}`,
    createSetButton: 'div[role="dialog"] button:has-text("Create Set")',
    cancelButton: 'div[role="dialog"] button:has-text("Cancel")',

    // 선택 상태
    selectedItem: '.border-primary',
    checkIcon: 'svg.lucide-check',

    // 빈 상태
    emptyState: 'text=No Tool Sets',
    noAvailableTools: 'text=No Available Tools',

    // Badge
    toolsBadge: 'span:has-text("tools")',
    serversBadge: 'span:has-text("Servers")',

    // 토스트 메시지
    toast: '[data-sonner-toast], div[role="status"]',
} as const

/**
 * 타임아웃 설정
 */
export const TIMEOUTS = {
    short: 3000,   // 빠른 UI 반응
    medium: 5000,  // 일반적인 API 응답
    long: 10000,   // 느린 네트워크
} as const

/**
 * 테스트 데이터
 */
export const TEST_DATA = {
    defaultToolSetNames: ['All Tools', 'CLI Tools', 'IDEs', 'Desktop Apps'],
    customSetName: 'My Custom Set',
    customSetDescription: 'Test description for E2E',
} as const

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 고유한 이름 생성
 */
export function generateUniqueName(prefix: string = 'Test'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 6)
    return `${prefix}-${timestamp}-${random}`
}

/**
 * Sync 페이지로 이동 및 로드 대기
 */
export async function navigateToSyncPage(page: Page): Promise<void> {
    await page.goto('/sync')
    await page.waitForLoadState('networkidle')
    // 3컬럼 헤더가 모두 로드될 때까지 대기
    await expect(page.locator(SELECTORS.targetToolsHeader)).toBeVisible({ timeout: TIMEOUTS.medium })
    await expect(page.locator(SELECTORS.rulesSourceHeader)).toBeVisible({ timeout: TIMEOUTS.medium })
    await expect(page.locator(SELECTORS.mcpServerSetHeader)).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Tool Set 선택
 */
export async function selectToolSet(page: Page, name: string): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()
    await setItem.click()
    // 선택 상태 확인 (border-primary 클래스)
    await expect(setItem).toHaveClass(/border-primary/, { timeout: TIMEOUTS.short })
}

/**
 * Tool Set이 선택되어 있는지 확인
 */
export async function expectToolSetSelected(page: Page, name: string, isSelected: boolean = true): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()
    if (isSelected) {
        await expect(setItem).toHaveClass(/border-primary/, { timeout: TIMEOUTS.short })
    } else {
        await expect(setItem).not.toHaveClass(/border-primary/, { timeout: TIMEOUTS.short })
    }
}

/**
 * 커스텀 Tool Set 생성 다이얼로그 열기
 */
export async function openCreateSetDialog(page: Page): Promise<void> {
    // + 버튼 찾기 (Target Tools 헤더 옆)
    const addButton = page.locator(SELECTORS.addToolSetButton).first()
    await addButton.click()
    await expect(page.locator(SELECTORS.createSetDialog)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * 커스텀 Tool Set 생성
 */
export async function createCustomToolSet(
    page: Page,
    name: string,
    options?: {
        description?: string
        toolIds?: string[]
    }
): Promise<string> {
    await openCreateSetDialog(page)

    // 이름 입력
    await page.locator(SELECTORS.setNameInput).fill(name)

    // 설명 입력 (선택)
    if (options?.description) {
        await page.locator(SELECTORS.setDescriptionInput).fill(options.description)
    }

    // 도구 선택 (선택)
    if (options?.toolIds && options.toolIds.length > 0) {
        for (const toolId of options.toolIds) {
            const checkbox = page.locator(SELECTORS.toolCheckbox(toolId))
            if (await checkbox.isVisible().catch(() => false)) {
                await checkbox.check()
            }
        }
    } else {
        // 기본: 첫 번째 도구 선택
        const firstCheckbox = page.locator('div[role="dialog"] input[type="checkbox"]').first()
        if (await firstCheckbox.isVisible().catch(() => false)) {
            await firstCheckbox.check()
        }
    }

    // Create Set 버튼 클릭
    await page.locator(SELECTORS.createSetButton).click()

    // 다이얼로그 닫힘 대기
    await expect(page.locator(SELECTORS.createSetDialog)).not.toBeVisible({ timeout: TIMEOUTS.medium })

    return name
}

/**
 * 커스텀 Tool Set 삭제
 */
export async function deleteCustomToolSet(page: Page, name: string): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()

    // 호버하여 삭제 버튼 표시
    await setItem.hover()
    await page.waitForTimeout(200)

    // 삭제 버튼 클릭
    const deleteButton = setItem.locator(SELECTORS.toolSetDeleteButton)
    await deleteButton.click()

    // 확인 다이얼로그 (window.confirm 사용)
    page.once('dialog', async dialog => {
        await dialog.accept()
    })

    // 목록에서 제거 확인
    await expect(setItem).not.toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Tool Set 목록에 특정 Set이 존재하는지 확인
 */
export async function expectToolSetInList(page: Page, name: string, shouldExist: boolean = true): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()
    if (shouldExist) {
        await expect(setItem).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(setItem).not.toBeVisible({ timeout: TIMEOUTS.medium })
    }
}

/**
 * Rule 선택
 */
export async function selectRule(page: Page, name: string): Promise<void> {
    const ruleItem = page.locator(SELECTORS.ruleItem(name)).first()
    await ruleItem.click()
    // 체크 아이콘 표시 확인
    await expect(ruleItem.locator(SELECTORS.checkIcon)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Rule 선택 해제 (None 선택)
 */
export async function selectNoRule(page: Page): Promise<void> {
    const noneOption = page.locator(SELECTORS.ruleNoneOption).first()
    await noneOption.click()
    // 체크 아이콘 표시 확인
    await expect(noneOption.locator(SELECTORS.checkIcon)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * MCP Set 선택
 */
export async function selectMcpSet(page: Page, name: string): Promise<void> {
    const mcpSetItem = page.locator(SELECTORS.mcpSetItem(name)).first()
    await mcpSetItem.click()
    // 체크 아이콘 표시 확인
    await expect(mcpSetItem.locator(SELECTORS.checkIcon)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * MCP Set 선택 해제 (None 선택)
 */
export async function selectNoMcpSet(page: Page): Promise<void> {
    const noneOption = page.locator(SELECTORS.mcpSetNoneOption).first()
    await noneOption.click()
    // 체크 아이콘 표시 확인
    await expect(noneOption.locator(SELECTORS.checkIcon)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Rule이 선택되어 있는지 확인
 */
export async function expectRuleSelected(page: Page, name: string, isSelected: boolean = true): Promise<void> {
    const ruleItem = page.locator(SELECTORS.ruleItem(name)).first()
    const checkIcon = ruleItem.locator(SELECTORS.checkIcon)
    if (isSelected) {
        await expect(checkIcon).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        await expect(checkIcon).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * MCP Set이 선택되어 있는지 확인
 */
export async function expectMcpSetSelected(page: Page, name: string, isSelected: boolean = true): Promise<void> {
    const mcpSetItem = page.locator(SELECTORS.mcpSetItem(name)).first()
    const checkIcon = mcpSetItem.locator(SELECTORS.checkIcon)
    if (isSelected) {
        await expect(checkIcon).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        await expect(checkIcon).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 토스트 메시지 확인
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
    const toastContainer = page.locator('[data-sonner-toast], div[role="status"], .toast, [class*="Toaster"] div')
    const toastWithMessage = toastContainer.filter({ hasText: message })
    await expect(toastWithMessage.first()).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * 테스트 후 LocalStorage 정리 (커스텀 Set 삭제)
 */
export async function cleanupLocalStorage(page: Page): Promise<void> {
    await page.evaluate(() => {
        localStorage.removeItem('custom-tool-sets')
    })
}

/**
 * LocalStorage에 커스텀 Tool Set 추가 (테스트 데이터 설정)
 */
export async function seedCustomToolSet(
    page: Page,
    set: {
        id: string
        name: string
        description?: string
        toolIds: string[]
    }
): Promise<void> {
    await page.evaluate((setData) => {
        const existing = JSON.parse(localStorage.getItem('custom-tool-sets') || '[]')
        existing.push({
            ...setData,
            isDefault: false
        })
        localStorage.setItem('custom-tool-sets', JSON.stringify(existing))
    }, set)
}

/**
 * LocalStorage에서 커스텀 Tool Set 이름 존재 여부 확인
 */
export async function checkCustomSetExists(page: Page, name: string): Promise<boolean> {
    return await page.evaluate((setName) => {
        const sets = JSON.parse(localStorage.getItem('custom-tool-sets') || '[]')
        return sets.some((s: { name: string }) => s.name === setName)
    }, name)
}

// ============================================================================
// Tool Set 확장/축소 관련 헬퍼 함수
// ============================================================================

/**
 * Tool Set 확장 (토글 버튼 클릭)
 */
export async function expandToolSet(page: Page, name: string): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()
    await setItem.hover()
    await page.waitForTimeout(200)

    const toggleButton = setItem.locator(SELECTORS.toolSetToggleButton)
    await toggleButton.click()

    // 확장 영역이 표시될 때까지 대기
    await expect(setItem.locator(SELECTORS.toolSetExpandedArea)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Tool Set 축소 (토글 버튼 클릭)
 */
export async function collapseToolSet(page: Page, name: string): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()
    await setItem.hover()
    await page.waitForTimeout(200)

    const toggleButton = setItem.locator(SELECTORS.toolSetToggleButton)
    await toggleButton.click()

    // 확장 영역이 숨겨질 때까지 대기
    await expect(setItem.locator(SELECTORS.toolSetExpandedArea)).not.toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Tool Set이 확장되었는지 확인
 */
export async function expectToolSetExpanded(page: Page, name: string, isExpanded: boolean = true): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(name)).first()
    const expandedArea = setItem.locator(SELECTORS.toolSetExpandedArea)

    if (isExpanded) {
        await expect(expandedArea).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        await expect(expandedArea).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 확장된 Tool Set 내에서 개별 Tool 체크박스 클릭
 */
export async function toggleIndividualTool(page: Page, setName: string, toolName: string): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(setName)).first()

    // 확장된 영역 내의 체크박스 찾기
    const checkbox = setItem.locator(`div.border-t label:has-text("${toolName}")`).locator('..').locator('input[type="checkbox"]')

    // 체크박스가 없으면 label로 클릭
    const checkboxVisible = await checkbox.isVisible().catch(() => false)
    if (checkboxVisible) {
        await checkbox.click()
    } else {
        // label 직접 클릭 시도
        const label = setItem.locator(`div.border-t label:has-text("${toolName}")`)
        await label.click()
    }
}

/**
 * 개별 Tool 체크박스가 체크되었는지 확인
 */
export async function expectIndividualToolChecked(page: Page, setName: string, toolName: string, isChecked: boolean = true): Promise<void> {
    const setItem = page.locator(SELECTORS.toolSetItem(setName)).first()
    const checkboxContainer = setItem.locator(`div.border-t div:has(label:has-text("${toolName}"))`)
    const checkbox = checkboxContainer.locator('button[role="checkbox"], input[type="checkbox"]').first()

    if (isChecked) {
        await expect(checkbox).toHaveAttribute('data-state', 'checked', { timeout: TIMEOUTS.short })
    } else {
        await expect(checkbox).toHaveAttribute('data-state', 'unchecked', { timeout: TIMEOUTS.short })
    }
}

// ============================================================================
// API Helpers (Data Isolation)
// ============================================================================

const API_BASE_URL = 'http://localhost:3001'

/**
 * Reset Database via API
 */
export async function resetDatabase(request: APIRequestContext): Promise<void> {
    const response = await request.post(`${API_BASE_URL}/api/__test__/reset`)
    expect(response.ok(), 'Failed to reset database').toBeTruthy()
}

/**
 * Seed Tools Data via API
 */
export async function seedToolsData(request: APIRequestContext, data: {
    tools?: Array<{
        id: string
        name: string
        configPath?: string
        exists?: boolean
    }>
}): Promise<void> {
    const response = await request.post(`${API_BASE_URL}/api/__test__/seed/tools`, {
        data: data
    })
    expect(response.ok(), 'Failed to seed Tools data').toBeTruthy()
}

/**
 * Seed Rules Data via API
 */
export async function seedRulesData(request: APIRequestContext, data: {
    rules?: Array<{
        id: string
        name: string
        content: string
    }>
}): Promise<void> {
    const response = await request.post(`${API_BASE_URL}/api/__test__/seed/rules`, {
        data: data
    })
    expect(response.ok(), 'Failed to seed Rules data').toBeTruthy()
}

/**
 * Seed MCP Data via API
 * Note: Type signature aligned with mcp.helpers.ts
 */
export async function seedMcpData(request: APIRequestContext, data: {
    tools?: Array<{
        id: string
        name: string
        command: string
        args: string[]
        env?: Record<string, string>
    }>
    sets?: Array<{
        id: string
        name: string
        isActive?: boolean
        items?: Array<{ id: string, serverId: string }>
    }>
}): Promise<void> {
    const response = await request.post(`${API_BASE_URL}/api/__test__/seed/mcp`, {
        data: data
    })
    expect(response.ok(), 'Failed to seed MCP data').toBeTruthy()
}
