/**
 * Tools E2E 테스트 헬퍼
 * 공통 셀렉터, 타임아웃, 유틸리티 함수 정의
 *
 * Tools 페이지 구조:
 * - 헤더: "도구 관리" 타이틀 + "Add Tool" 버튼
 * - 그리드: 도구 카드 목록 (3열 레이아웃)
 * - 카드: 도구 이름, 설정 경로, 상태 인디케이터, 더보기 메뉴
 */
import { Page, expect, APIRequestContext } from '@playwright/test'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 셀렉터 정의
 * ToolsPage.tsx의 실제 DOM 구조 기반
 */
export const SELECTORS = {
    // 페이지 헤더
    pageTitle: 'h1:has-text("도구 관리")',
    pageDescription: 'p.text-muted-foreground',
    addToolButton: 'button:has-text("Add Tool")',

    // 도구 카드
    toolCard: '.card',
    toolCardByName: (name: string) => `.card:has(h3:has-text("${name}"))`,
    toolName: 'h3.font-semibold',
    toolConfigPath: 'div.font-mono',
    toolStatusIndicator: 'div.rounded-full',
    customBadge: 'span:has-text("Custom")',
    moreButton: 'button:has(svg.lucide-more-vertical)',

    // 설정 편집 버튼
    editConfigButton: 'button:has-text("설정 편집")',
    notInstalledBadge: 'div.badge:has-text("미설치")',

    // 드롭다운 메뉴
    dropdownMenu: 'div[role="menu"]',
    editConfigMenuItem: 'div[role="menuitem"]:has-text("Edit Config")',
    checkHelpMenuItem: 'div[role="menuitem"]:has-text("Check Help")',
    openMcpMenuItem: 'div[role="menuitem"]:has-text("Open MCP")',
    deleteMenuItem: 'div[role="menuitem"]:has-text("Delete")',

    // Add Tool 모달
    addToolModal: 'div[role="dialog"]:has-text("Add Custom Tool")',
    toolNameInput: 'div[role="dialog"] input >> nth=0',
    configPathInput: 'div[role="dialog"] input >> nth=1',
    rulesPathInput: 'div[role="dialog"] input >> nth=2',
    mcpPathInput: 'div[role="dialog"] input >> nth=3',
    descriptionInput: 'div[role="dialog"] input >> nth=4',
    addToolModalButton: 'div[role="dialog"] button:has-text("Add Tool")',
    cancelButton: 'div[role="dialog"] button:has-text("Cancel")',

    // Help 모달
    helpModal: 'div[role="dialog"]:has(h2:has-text("--help"))',
    helpOutput: 'pre.whitespace-pre-wrap',
    helpSpinner: 'div[role="dialog"] svg.animate-spin',

    // Config Editor 모달
    configEditorModal: 'div[role="dialog"]:has-text("Config Editor"), div[role="dialog"]:has-text("설정")',

    // 토스트 메시지
    toast: '[data-sonner-toast], div[role="status"]',

    // 로딩 상태
    loadingSkeleton: '.skeleton, div[class*="Skeleton"]',
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
 * Built-in 도구 ID 목록
 */
export const BUILTIN_TOOL_IDS = [
    'cursor',
    'vscode',
    'windsurf',
    'claude-desktop',
    'zed'
] as const

/**
 * 테스트 데이터
 */
export const TEST_DATA = {
    defaultToolName: 'Test Custom Tool',
    defaultConfigPath: '/tmp/test-config.json',
    defaultRulesPath: '/tmp/test-rules',
    defaultMcpPath: '/tmp/test-mcp.json',
    defaultDescription: 'E2E Test Tool',
    longName: 'This is a very long tool name that should be truncated in the UI display area',
    specialChars: 'test-tool_v1.0',
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
 * Tools 페이지로 이동 및 로드 대기
 */
export async function navigateToToolsPage(page: Page): Promise<void> {
    await page.goto('/tools')
    await page.waitForLoadState('networkidle')
    // 페이지 타이틀이 로드될 때까지 대기
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * 도구 카드 개수 확인
 */
export async function getToolCardCount(page: Page): Promise<number> {
    await page.waitForTimeout(500) // DOM 안정화 대기
    return await page.locator(SELECTORS.toolCard).count()
}

/**
 * 커스텀 도구인지 확인
 */
export function isCustomToolId(id: string): boolean {
    return !BUILTIN_TOOL_IDS.includes(id as typeof BUILTIN_TOOL_IDS[number]) &&
        !id.startsWith('cursor-') &&
        !id.startsWith('vscode-')
}

/**
 * Add Tool 모달 열기
 */
export async function openAddToolModal(page: Page): Promise<void> {
    await page.locator(SELECTORS.addToolButton).click()
    await expect(page.locator(SELECTORS.addToolModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Add Tool 모달 닫기
 */
export async function closeAddToolModal(page: Page): Promise<void> {
    const modal = page.locator(SELECTORS.addToolModal)
    if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
        await page.locator(SELECTORS.cancelButton).click()
        await expect(modal).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 커스텀 도구 추가
 */
export async function addCustomTool(
    page: Page,
    name: string,
    options?: {
        configPath?: string
        rulesPath?: string
        mcpPath?: string
        description?: string
    }
): Promise<string> {
    await openAddToolModal(page)

    // 필드 입력
    const modal = page.locator(SELECTORS.addToolModal)
    const inputs = modal.locator('input')
    await inputs.nth(0).fill(name)

    if (options?.configPath) {
        await inputs.nth(1).fill(options.configPath)
    }
    if (options?.rulesPath) {
        await inputs.nth(2).fill(options.rulesPath)
    }
    if (options?.mcpPath) {
        await inputs.nth(3).fill(options.mcpPath)
    }
    if (options?.description) {
        await inputs.nth(4).fill(options.description)
    }

    // 추가 버튼 클릭
    await page.locator(SELECTORS.addToolModalButton).click()

    // 토스트 확인
    await expectToast(page, /added|success/i)

    // 모달 닫힘 확인
    await expect(page.locator(SELECTORS.addToolModal)).not.toBeVisible({ timeout: TIMEOUTS.short })

    return name
}

/**
 * 도구 드롭다운 메뉴 열기
 */
export async function openToolDropdown(page: Page, toolName: string): Promise<void> {
    const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()
    await toolCard.locator(SELECTORS.moreButton).click()
    await expect(page.locator(SELECTORS.dropdownMenu)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * 커스텀 도구 삭제
 */
export async function deleteCustomTool(page: Page, toolName: string): Promise<void> {
    await openToolDropdown(page, toolName)
    await page.locator(SELECTORS.deleteMenuItem).click()

    // 토스트 확인
    await expectToast(page, /deleted|success/i)

    // 목록에서 제거 확인
    await expect(page.locator(SELECTORS.toolCardByName(toolName))).not.toBeVisible({
        timeout: TIMEOUTS.medium
    })
}

/**
 * 설정 편집 모달 열기 (카드 버튼 통해)
 */
export async function openConfigEditorViaButton(page: Page, toolName: string): Promise<void> {
    const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()
    await toolCard.locator(SELECTORS.editConfigButton).click()
    await expect(page.locator(SELECTORS.configEditorModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * 설정 편집 모달 열기 (드롭다운 통해)
 */
export async function openConfigEditorViaDropdown(page: Page, toolName: string): Promise<void> {
    await openToolDropdown(page, toolName)
    await page.locator(SELECTORS.editConfigMenuItem).click()
    await expect(page.locator(SELECTORS.configEditorModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Help 모달 열기
 */
export async function openHelpModal(page: Page, toolName: string): Promise<void> {
    await openToolDropdown(page, toolName)
    await page.locator(SELECTORS.checkHelpMenuItem).click()
    await expect(page.locator(SELECTORS.helpModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * MCP 페이지 열기 (Claude Desktop 전용)
 */
export async function openMcpPage(page: Page): Promise<void> {
    await openToolDropdown(page, 'Claude Desktop')
    await page.locator(SELECTORS.openMcpMenuItem).click()
    // URL 해시 변경 확인
    await expect(page).toHaveURL(/#\/mcp/, { timeout: TIMEOUTS.short })
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
 * 도구 카드가 존재하는지 확인
 */
export async function expectToolInList(page: Page, toolName: string, shouldExist: boolean = true): Promise<void> {
    const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()
    if (shouldExist) {
        await expect(toolCard).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(toolCard).not.toBeVisible({ timeout: TIMEOUTS.medium })
    }
}

/**
 * 도구가 커스텀인지 확인 (Custom 배지 존재 여부)
 */
export async function expectToolIsCustom(page: Page, toolName: string, isCustom: boolean = true): Promise<void> {
    const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()
    const customBadge = toolCard.locator(SELECTORS.customBadge)

    if (isCustom) {
        await expect(customBadge).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        await expect(customBadge).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 도구가 설치되었는지 확인 (초록색 점 존재 여부)
 */
export async function expectToolIsInstalled(page: Page, toolName: string, isInstalled: boolean = true): Promise<void> {
    const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()

    if (isInstalled) {
        // 설치됨: 초록색 점 (bg-primary)
        await expect(toolCard.locator('div.bg-primary.rounded-full')).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        // 미설치: 회색 점 (bg-muted)
        await expect(toolCard.locator('div.bg-muted.rounded-full')).toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 테스트 후 정리 (생성된 커스텀 도구 삭제)
 */
export async function cleanupCustomTool(page: Page, toolName: string): Promise<void> {
    try {
        const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()
        if (await toolCard.isVisible({ timeout: 1000 })) {
            await deleteCustomTool(page, toolName)
        }
    } catch {
        // 이미 삭제되었거나 존재하지 않음 - 무시
    }
}

/**
 * 드롭다운 메뉴 아이템 존재 확인
 */
export async function expectDropdownMenuItem(
    page: Page,
    menuText: string,
    shouldExist: boolean = true
): Promise<void> {
    const menuItem = page.locator(`div[role="menuitem"]:has-text("${menuText}")`)
    if (shouldExist) {
        await expect(menuItem).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        await expect(menuItem).not.toBeVisible({ timeout: TIMEOUTS.short })
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
        rulesPath?: string
        mcpPath?: string
        description?: string
        exists?: boolean
    }>
}): Promise<void> {
    const response = await request.post(`${API_BASE_URL}/api/__test__/seed/tools`, {
        data: data
    })
    expect(response.ok(), 'Failed to seed Tools data').toBeTruthy()
}

/**
 * Get Tools via API
 */
export async function getToolsViaApi(request: APIRequestContext): Promise<Array<{
    id: string
    name: string
    configPath: string
    exists: boolean
}>> {
    const response = await request.get(`${API_BASE_URL}/api/tools`)
    expect(response.ok(), 'Failed to get tools').toBeTruthy()
    return response.json()
}

/**
 * Add Tool via API
 */
export async function addToolViaApi(request: APIRequestContext, data: {
    name: string
    configPath?: string
    rulesPath?: string
    mcpPath?: string
    description?: string
}): Promise<{ id: string }> {
    const response = await request.post(`${API_BASE_URL}/api/tools`, {
        data: data
    })
    expect(response.ok(), 'Failed to add tool via API').toBeTruthy()
    return response.json()
}

/**
 * Delete Tool via API
 */
export async function deleteToolViaApi(request: APIRequestContext, id: string): Promise<void> {
    const response = await request.delete(`${API_BASE_URL}/api/tools/${id}`)
    expect(response.ok(), 'Failed to delete tool via API').toBeTruthy()
}
