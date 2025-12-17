/**
 * MCP E2E 테스트 헬퍼
 * 공통 셀렉터, 타임아웃, 유틸리티 함수 정의
 *
 * MCP 페이지 구조:
 * - 좌측: Sets 목록 (MCP Set 관리)
 * - 우측: 선택된 Set의 상세 및 MCP 항목들
 * - Library: MCP Library (전역 MCP Definition Pool)
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
    setsPanel: 'div.rounded-xl:has(h3:has-text("MCP Sets"))',
    setsHeader: 'h3:has-text("MCP Sets")',
    addSetButton: 'h3:has-text("MCP Sets") + div button:has(svg.lucide-plus)',
    setItem: (name: string) => `div.group:has-text("${name}")`,
    setDeleteButton: 'button:has(svg.lucide-trash-2)',

    // Set 상세 (우측 패널)
    setDetailCard: '[class*="CardHeader"]',
    setTitle: '[class*="CardTitle"]',
    addMcpButton: 'button:has-text("Add")',
    moreOptionsButton: '[data-testid="more-options-button"]',

    // MCP 항목 (Set 내부)
    mcpItem: (name: string) => `[data-testid="set-item-${name}"]`,
    mcpItemEdit: 'button:has(svg.lucide-edit)',
    mcpItemDelete: 'button:has(svg.lucide-trash-2)',
    mcpItemSwitch: 'button[role="switch"]',

    // Create Set 모달
    createSetModal: '[data-testid="create-set-modal"]',
    setNameInput: '[data-testid="set-name-input"]',
    setDescInput: '[data-testid="set-desc-input"]',
    createSetButton: '[data-testid="create-set-modal"] button:has-text("Create")',
    modalCancelButton: '[data-testid="create-set-modal"] button:has-text("Cancel")',

    // Delete Confirmation Dialog
    deleteDialog: 'div[role="dialog"]', // Generic
    deleteMcpDialog: 'div[role="dialog"]:has-text("Delete MCP")',    // Delete Confirmation Dialog (Old duplicate removed)
    deleteSetDialog: 'div[role="dialog"]:has-text("Delete Set")', // Specific for Set

    // Dialog Buttons (Standardized)
    confirmDeleteButton: 'div[role="dialog"] button:has-text("Delete")',
    cancelDeleteButton: 'div[role="dialog"] button:has-text("Cancel")',

    // MCP Library Panel (Old Sheet)
    librarySheet: '[data-testid="library-panel"]',
    libraryTitle: '[data-testid="library-panel"] h3:has-text("Library")',
    newMcpButton: '[data-testid="library-panel"] button[title="Create new"]',
    importButton: '[data-testid="library-panel"] button[title="Import"]',
    addToSetButton: 'button:has-text("Add to Set")',

    // Add/Edit MCP 모달
    mcpModal: '[data-testid="mcp-modal"]',
    mcpNameInput: '[data-testid="mcp-name-input"]',
    mcpCommandInput: '[data-testid="mcp-command-input"]',
    mcpArgsInput: '[data-testid="mcp-args-input"]',
    mcpUrlInput: '[data-testid="mcp-url-input"]',
    mcpCwdInput: 'div[role="dialog"] input >> nth=3', // TBD: Add testid if needed, forcing nth for now if not added
    addEnvButton: '[data-testid="add-env-var-button"]',
    envKeyInput: (index: number) => `[data-testid="env-key-input-${index}"]`,
    envValueInput: (index: number) => `[data-testid="env-value-input-${index}"]`,
    saveMcpButton: '[data-testid="mcp-modal"] button:has-text("Save")',

    // Delete MCP 확인 다이얼로그 (Removed duplicate)
    // deleteMcpDialog: 'div[role="dialog"]:has-text("Delete MCP Definition")',

    // Import 모달
    importModal: 'div[role="dialog"]:has-text("Import MCP Servers")',
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
    const baseURL = 'http://localhost:5173'
    await page.goto(`${baseURL}/mcp`)
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
    await page.locator(SELECTORS.setNameInput).fill(name)
    if (description) {
        await page.locator(SELECTORS.setDescInput).fill(description)
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
 * MCP Library 열기 (Visible 확인)
 */
export async function openLibrary(page: Page): Promise<void> {
    // Library Panel은 항상 Visible 상태임 (3단 레이아웃)
    // 하지만 확실히 로드를 기다리기 위해 체크
    await expect(page.locator(SELECTORS.librarySheet)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * MCP Library Sheet 닫기 (Obsolete - No Op)
 */
export async function closeLibrary(page: Page): Promise<void> {
    // Library는 항상 열려있으므로 닫을 수 없음
    // 테스트 호환성을 위해 유지하되 아무 동작 안함
    return
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
    // Library 열기 (Visible Check)
    await openLibrary(page)

    // New 버튼 클릭
    await page.locator(SELECTORS.newMcpButton).click()

    // Add New MCP 모달이 열릴 때까지 대기
    const addMcpModal = page.locator(SELECTORS.mcpModal)
    await expect(addMcpModal).toBeVisible({ timeout: TIMEOUTS.short })

    // 입력
    await page.locator(SELECTORS.mcpNameInput).fill(name)
    await page.locator(SELECTORS.mcpCommandInput).fill(command)
    if (args) {
        await page.locator(SELECTORS.mcpArgsInput).fill(args)
    }

    // 저장
    await page.locator(SELECTORS.saveMcpButton).click()

    // 모달 닫힘 대기
    await expect(addMcpModal).not.toBeVisible({ timeout: TIMEOUTS.medium })

    return name
}

/**
 * MCP Definition을 Set에 추가
 */
export async function addMcpToSet(page: Page, mcpName: string): Promise<void> {
    // Library Panel 내에서 해당 MCP 찾기
    const libraryPanel = page.locator(SELECTORS.librarySheet).first()
    const mcpCard = libraryPanel.locator(`[data-testid="library-item-${mcpName}"]`).first()

    // Add to Set 버튼 클릭
    // 버튼을 가리키는 포인터는 button[title="Add to Set"] 인데, isAssigned면 disabled임
    // testid가 있는 요소 안에서 버튼 찾기
    await mcpCard.locator('button[title="Add to Set"]').click()

    // 토스트 확인
    await expectToast(page, /added|success/i)
}

/**
 * Set에서 MCP 제거
 */
export async function removeMcpFromSet(page: Page, mcpName: string): Promise<void> {
    const mcpItem = page.locator(SELECTORS.mcpItem(mcpName)).first()

    // 메뉴 열기
    await mcpItem.locator(SELECTORS.moreOptionsButton).click()

    // Remove 클릭
    await page.locator('div[role="menuitem"]:has-text("Remove")').click()

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
    // Library Visible Check
    await openLibrary(page)

    // Library Panel 내에서 MCP 찾기
    const libraryPanel = page.locator(SELECTORS.librarySheet).first()
    const mcpCard = libraryPanel.locator(`[data-testid="library-item-${name}"]`).first()

    // 메뉴 열기
    await mcpCard.locator(SELECTORS.moreOptionsButton).click()

    // Delete 클릭
    await page.locator('div[role="menuitem"]:has-text("Delete")').click()

    // 확인 다이얼로그
    await expect(page.locator(SELECTORS.deleteMcpDialog)).toBeVisible({ timeout: TIMEOUTS.short })
    await page.locator('div[role="dialog"]:has-text("Delete MCP") button:has-text("Delete")').click()

    // 삭제 확인
    // 삭제 확인 (토스트 메시지 기다림 - 백엔드 처리가 완료됨을 보장)
    await expect(page.locator("text='MCP Definition deleted'")).toBeVisible({ timeout: 10000 })
    await expect(page.locator(SELECTORS.deleteMcpDialog)).not.toBeVisible({ timeout: TIMEOUTS.medium })
}



/**
 * HTTP/SSE 타입 MCP Definition 생성 (Library에서)
 */
export async function createHttpMcpDef(
    page: Page,
    name: string,
    type: 'http' | 'sse',
    url: string
): Promise<string> {
    // Library Visible Check
    await openLibrary(page)

    // New 버튼 클릭
    await page.locator(SELECTORS.newMcpButton).click()

    // Add MCP Definition 모달이 열릴 때까지 대기
    const addMcpModal = page.locator(SELECTORS.mcpModal)
    await expect(addMcpModal).toBeVisible({ timeout: TIMEOUTS.short })

    // Name 입력
    await page.locator(SELECTORS.mcpNameInput).fill(name)

    // Type 선택 버튼 클릭
    await addMcpModal.locator(`button:has-text("${type}")`).click()

    // URL 입력
    const urlInput = page.locator(SELECTORS.mcpUrlInput)
    await expect(urlInput).toBeVisible({ timeout: TIMEOUTS.short })
    await urlInput.fill(url)

    // 저장
    await page.locator(SELECTORS.saveMcpButton).click()

    // 모달 닫힘 대기
    await expect(addMcpModal).not.toBeVisible({ timeout: TIMEOUTS.medium })

    return name
}

/**
 * Import 모달 열기
 */
export async function openImportModal(page: Page): Promise<void> {
    // Library Visible Check
    await openLibrary(page)

    // Import 버튼 클릭
    await page.locator(SELECTORS.importButton).click()

    // Import 모달 대기
    await expect(page.locator(SELECTORS.importModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * JSON Import 실행
 */
export async function importJson(page: Page, json: string): Promise<void> {
    // JSON 입력
    await page.locator(SELECTORS.jsonTextarea).fill(json)

    // Import 버튼 클릭
    await page.locator(SELECTORS.importConfirmButton).click()

    // 토스트 확인
    await expectToast(page, /imported|success/i)

    // 모달 닫힘 대기
    await expect(page.locator(SELECTORS.importModal)).not.toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Library에서 MCP Definition 존재 확인
 */
export async function expectMcpDefInLibrary(
    page: Page,
    name: string,
    shouldExist: boolean = true
): Promise<void> {
    // Library Visible Check
    await openLibrary(page)

    const libraryPanel = page.locator(SELECTORS.librarySheet).first()
    const mcpCard = libraryPanel.locator(`[data-testid="library-item-${name}"]`).first()

    if (shouldExist) {
        await expect(mcpCard).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(mcpCard).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}
