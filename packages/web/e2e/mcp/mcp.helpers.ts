/**
 * MCP E2E 테스트 헬퍼
 * 공통 셀렉터, 타임아웃, 유틸리티 함수 정의
 *
 * MCP 페이지 구조:
 * - 좌측: Sets 목록 (MCP Set 관리)
 * - 우측: 선택된 Set의 상세 및 MCP 항목들
 * - Sheet: MCP Library (전역 MCP Definition Pool)
 */
import { Page, expect } from '@playwright/test'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 셀렉터 정의
 * McpPage.tsx의 실제 DOM 구조 기반
 */
export const SELECTORS = {
    // Sets 목록 (좌측 패널)
    setsPanel: '.w-80',
    setsHeader: 'h3:has-text("Sets")',
    addSetButton: '.w-80 button:has(svg.lucide-plus)',
    setItem: (name: string) => `div.group:has-text("${name}")`,
    setDeleteButton: 'button:has(svg.lucide-trash-2)',

    // Set 상세 (우측 패널)
    setDetailCard: '[class*="CardHeader"]',
    setTitle: '[class*="CardTitle"]',
    addMcpButton: 'button:has-text("Add")',
    moreOptionsButton: 'button:has(svg.lucide-more-vertical)',

    // MCP 항목 (Set 내부)
    mcpItem: (name: string) => `div:has(h4:text("${name}"))`,
    mcpItemEdit: 'button:has(svg.lucide-edit)',
    mcpItemDelete: 'button:has(svg.lucide-trash-2)',
    mcpItemSwitch: 'button[role="switch"]',

    // Create Set 모달
    createSetModal: 'div[role="dialog"]:has-text("Create New MCP Set")',
    setNameInput: 'div[role="dialog"] input',
    setDescInput: 'div[role="dialog"] input:nth-of-type(2)',
    createSetButton: 'div[role="dialog"] button:has-text("Create")',
    modalCancelButton: 'div[role="dialog"] button:has-text("Cancel")',

    // Delete Set 확인 다이얼로그
    deleteSetDialog: 'div[role="dialog"]:has-text("Delete Set")',
    confirmDeleteButton: 'div[role="dialog"]:has-text("Delete") button:has-text("Delete")',
    cancelDeleteButton: 'div[role="dialog"]:has-text("Delete") button:has-text("Cancel")',

    // MCP Library Sheet
    librarySheet: '[data-state="open"] [class*="SheetContent"]',
    libraryTitle: 'text=MCP Library',
    newMcpButton: 'button:has-text("New")',
    importButton: 'button:has-text("Import")',
    addToSetButton: 'button:has-text("Add to Set")',

    // Add/Edit MCP 모달 (Library Sheet가 아닌 center dialog)
    mcpModal: 'div[role="dialog"]:has-text("Add New MCP"), div[role="dialog"]:has-text("Edit MCP")',
    mcpNameInput: 'div[role="dialog"]:not([aria-label="MCP Library"]) input >> nth=0',
    mcpCommandInput: 'div[role="dialog"]:not([aria-label="MCP Library"]) input >> nth=1',
    mcpArgsInput: 'div[role="dialog"]:not([aria-label="MCP Library"]) input >> nth=2',
    mcpCwdInput: 'div[role="dialog"]:not([aria-label="MCP Library"]) input >> nth=3',
    mcpEnvInput: 'div[role="dialog"]:not([aria-label="MCP Library"]) input >> nth=4',
    saveMcpButton: 'div[role="dialog"]:not([aria-label="MCP Library"]) button:has-text("Save")',

    // Delete MCP 확인 다이얼로그
    deleteMcpDialog: 'div[role="dialog"]:has-text("Delete MCP")',

    // Import 모달
    importModal: 'div[role="dialog"]:has-text("Import MCP")',
    githubUrlInput: 'input[placeholder*="github"]',
    loadButton: 'button:has-text("Load")',
    jsonTextarea: 'textarea',
    importConfirmButton: 'div[role="dialog"]:has-text("Import") button:has-text("Import")',

    // Empty States
    emptySetState: 'text=No Sets Created',
    emptyMcpState: 'text=No MCPs Configured',
    emptyLibraryState: 'text=Library is empty',
    noSetSelectedState: 'text=No Set Selected',

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
    defaultSetName: 'Test Set',
    defaultSetDescription: 'Test set for E2E testing',
    defaultMcpName: 'test-mcp',
    defaultCommand: 'npx',
    defaultArgs: '-y @test/mcp-server',
    longName: 'This is a very long MCP server name that should be truncated in the UI display area',
    specialChars: 'test-server_v1.0',
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
 * MCP 페이지로 이동 및 로드 대기
 */
export async function navigateToMcpPage(page: Page): Promise<void> {
    await page.goto('/mcp')
    await page.waitForLoadState('networkidle')
    // Sets 패널이 로드될 때까지 대기
    await expect(page.locator(SELECTORS.setsHeader)).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * MCP Set 생성
 */
export async function createSet(
    page: Page,
    name: string,
    description?: string
): Promise<string> {
    // 모달 열기
    await page.locator(SELECTORS.addSetButton).click()
    await expect(page.locator(SELECTORS.createSetModal)).toBeVisible({ timeout: TIMEOUTS.short })

    // 입력
    const inputs = page.locator('div[role="dialog"] input')
    await inputs.nth(0).fill(name)
    if (description) {
        await inputs.nth(1).fill(description)
    }

    // 생성
    await page.locator(SELECTORS.createSetButton).click()

    // 목록에 나타날 때까지 대기
    await expect(page.locator(SELECTORS.setItem(name)).first()).toBeVisible({
        timeout: TIMEOUTS.medium
    })

    return name
}

/**
 * MCP Set 선택
 */
export async function selectSet(page: Page, name: string): Promise<void> {
    const setItem = page.locator(SELECTORS.setItem(name)).first()
    await setItem.click()
    // 선택 상태 확인 - 우측에 Set 이름이 표시되면 선택된 것
    await expect(page.locator(`h3:has-text("${name}")`).first()).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * MCP Set 삭제
 */
export async function deleteSet(page: Page, name: string): Promise<void> {
    const setItem = page.locator(SELECTORS.setItem(name)).first()

    // 호버하여 삭제 버튼 표시
    await setItem.hover()

    // 삭제 버튼 클릭
    await setItem.locator(SELECTORS.setDeleteButton).click()

    // 확인 다이얼로그 대기
    await expect(page.locator(SELECTORS.deleteSetDialog)).toBeVisible({ timeout: TIMEOUTS.short })

    // 삭제 확인
    await page.locator(SELECTORS.confirmDeleteButton).click()

    // 다이얼로그 닫힘 및 목록에서 제거 확인
    await expect(page.locator(SELECTORS.deleteSetDialog)).not.toBeVisible({ timeout: TIMEOUTS.short })
    await expect(page.locator(SELECTORS.setItem(name))).not.toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * MCP Library 열기
 */
export async function openLibrary(page: Page): Promise<void> {
    // Library Sheet가 이미 열려있으면 스킵
    const librarySheet = page.locator('[data-state="open"].fixed.inset-y-0.right-0')
    const libraryVisible = await librarySheet.isVisible().catch(() => false)
    if (libraryVisible) return

    // "Add" 버튼 또는 "Open Library" 버튼 클릭
    const addButton = page.locator('button:has-text("Add")').first()
    const openLibraryButton = page.locator('button:has-text("Open Library")').first()

    if (await addButton.isVisible().catch(() => false)) {
        await addButton.click()
    } else if (await openLibraryButton.isVisible().catch(() => false)) {
        await openLibraryButton.click()
    } else {
        throw new Error('Cannot find Add or Open Library button. Is a Set selected?')
    }

    // Library Sheet가 열릴 때까지 대기
    await expect(librarySheet).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * MCP Library Sheet 닫기
 */
export async function closeLibrary(page: Page): Promise<void> {
    const closeButton = page.locator('button[aria-label="Close"]').first()
    if (await closeButton.isVisible().catch(() => false)) {
        await closeButton.click()
    } else {
        await page.keyboard.press('Escape')
    }
    await page.waitForTimeout(300)
}

/**
 * MCP Definition 생성 (Library에서)
 */
export async function createMcpDef(
    page: Page,
    name: string,
    command: string = TEST_DATA.defaultCommand,
    args?: string
): Promise<string> {
    // Library가 열려있지 않으면 열기
    await openLibrary(page)

    // New 버튼 클릭
    await page.locator(SELECTORS.newMcpButton).click()

    // Add New MCP 모달이 열릴 때까지 대기
    const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
    await expect(addMcpModal).toBeVisible({ timeout: TIMEOUTS.short })

    // 입력 (모달 내부의 input들)
    const inputs = addMcpModal.locator('input')
    await inputs.nth(0).fill(name)
    await inputs.nth(1).fill(command)
    if (args) {
        await inputs.nth(2).fill(args)
    }

    // 저장
    await addMcpModal.locator('button:has-text("Save")').click()

    // 모달 닫힘 대기
    await expect(addMcpModal).not.toBeVisible({ timeout: TIMEOUTS.medium })

    return name
}

/**
 * MCP Definition을 Set에 추가
 */
export async function addMcpToSet(page: Page, mcpName: string): Promise<void> {
    // Library Sheet 내에서 해당 MCP 찾기 (Sheet는 inset-y-0 right-0 클래스를 가짐)
    const librarySheet = page.locator('[data-state="open"].fixed.inset-y-0.right-0').first()
    const mcpCard = librarySheet.locator(`div:has(h4:text("${mcpName}"))`).first()
    await mcpCard.locator('button:has-text("Add to Set")').click()

    // 토스트 확인
    await expectToast(page, /added|success/i)
}

/**
 * Set에서 MCP 제거
 */
export async function removeMcpFromSet(page: Page, mcpName: string): Promise<void> {
    const mcpItem = page.locator(SELECTORS.mcpItem(mcpName)).first()
    await mcpItem.locator(SELECTORS.mcpItemDelete).click()

    await expectToast(page, /removed|success/i)
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
 * Set 목록에 특정 Set이 존재하는지 확인
 */
export async function expectSetInList(page: Page, name: string, shouldExist: boolean = true): Promise<void> {
    const setItem = page.locator(SELECTORS.setItem(name)).first()
    if (shouldExist) {
        await expect(setItem).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(setItem).not.toBeVisible({ timeout: TIMEOUTS.medium })
    }
}

/**
 * Set 상세에 특정 MCP가 존재하는지 확인
 */
export async function expectMcpInSet(page: Page, mcpName: string, shouldExist: boolean = true): Promise<void> {
    const mcpItem = page.locator(`h4:has-text("${mcpName}")`).first()
    if (shouldExist) {
        await expect(mcpItem).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(mcpItem).not.toBeVisible({ timeout: TIMEOUTS.medium })
    }
}

/**
 * 테스트 후 정리 (생성된 Set 삭제)
 */
export async function cleanupSet(page: Page, name: string): Promise<void> {
    try {
        const setItem = page.locator(SELECTORS.setItem(name)).first()
        if (await setItem.isVisible({ timeout: 1000 })) {
            await deleteSet(page, name)
        }
    } catch {
        // 이미 삭제되었거나 존재하지 않음 - 무시
    }
}

/**
 * Library에서 MCP Definition 삭제
 */
export async function deleteMcpDef(page: Page, name: string): Promise<void> {
    // Library가 열려있지 않으면 열기
    await openLibrary(page)

    // Library Sheet 내에서 MCP 찾기 (Sheet는 inset-y-0 right-0 클래스를 가짐)
    const librarySheet = page.locator('[data-state="open"].fixed.inset-y-0.right-0').first()
    const mcpCard = librarySheet.locator(`div:has(h4:text("${name}"))`).first()

    // 삭제 버튼 클릭
    await mcpCard.locator('button:has(svg.lucide-trash-2)').first().click()

    // 확인 다이얼로그
    await expect(page.locator(SELECTORS.deleteMcpDialog)).toBeVisible({ timeout: TIMEOUTS.short })
    await page.locator('div[role="dialog"]:has-text("Delete MCP") button:has-text("Delete")').click()

    // 삭제 확인
    await expect(page.locator(SELECTORS.deleteMcpDialog)).not.toBeVisible({ timeout: TIMEOUTS.short })
}
