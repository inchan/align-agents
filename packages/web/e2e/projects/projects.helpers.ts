/**
 * Projects E2E 테스트 헬퍼
 * 공통 셀렉터, 타임아웃, 유틸리티 함수 정의
 *
 * Projects 페이지 구조:
 * - 좌측: Project 목록 (Global Settings + Projects)
 * - 우측: 선택된 항목의 상세 정보
 * - 모달: Project 생성/편집
 */
import { Page, expect } from '@playwright/test'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 셀렉터 정의
 * ProjectsPage.tsx의 실제 DOM 구조 기반
 */
export const SELECTORS = {
    // 좌측 패널 - 목록
    listPanel: 'div.w-80.flex-shrink-0',
    listHeader: 'h3:has-text("Projects")',
    scanButton: 'button:has(svg.lucide-refresh-cw):not(:has-text("Sync"))',
    addButton: 'button[title="프로젝트 추가"], button:has(svg.lucide-plus)',
    sortMenuButton: 'button:has(svg.lucide-list-filter)',

    // Global Settings 항목
    globalItem: 'div:has-text("Global Settings"):has(svg.lucide-globe)',
    globalItemSelected: 'div.border-primary:has-text("Global Settings")',

    // Project 항목
    projectItem: (name: string) => `div.px-3.py-3.rounded-lg:has-text("${name}")`,
    projectItemSelected: (name: string) => `div.border-primary:has-text("${name}")`,
    projectMoreButton: 'button:has(svg.lucide-more-vertical)',
    projectEditMenu: 'div[role="menuitem"]:has-text("Edit")',
    projectDeleteMenu: 'div[role="menuitem"]:has-text("Delete")',

    // 우측 패널 - Global Settings 뷰
    globalConfigTitle: 'h2:has-text("Global Configuration"), div:has-text("Global Configuration")',
    globalToolTable: 'div.divide-y',
    globalToolRow: (toolName: string) => `div:has-text("${toolName}"):has(svg.lucide-file-json)`,

    // 우측 패널 - Project 상세 뷰
    projectDetailTitle: (name: string) => `h2:has-text("${name}"), div[class*="CardTitle"]:has-text("${name}")`,
    projectDetailPath: 'div[class*="CardDescription"] span.font-mono',
    editProjectButton: 'button:has-text("Edit Project")',
    toolsTable: 'div.divide-y',
    noToolsDetected: 'div:has-text("No Tools Detected")',

    // 우측 패널 - Empty State
    noProjectSelected: 'div:has-text("No Project Selected")',

    // Create Modal
    createModal: 'div[role="dialog"]:has-text("Add Project")',
    pathInput: 'input[id="path"]',
    nameInput: 'input[id="name"]',
    browseButton: 'button:has-text("Browse")',
    addProjectButton: 'button:has-text("Add Project")',
    cancelButton: 'button:has-text("Cancel")',

    // Edit Modal
    editModal: 'div[role="dialog"]:has-text("Edit Project")',
    saveChangesButton: 'button:has-text("Save Changes")',

    // Delete Confirmation (browser confirm 사용)
    // 현재 구현은 window.confirm() 사용

    // Sort Menu
    sortMenuContent: 'div[role="menu"]',
    sortByCreated: 'div[role="menuitem"]:has-text("생성일")',
    sortByUpdated: 'div[role="menuitem"]:has-text("수정일")',
    sortByAZ: 'div[role="menuitem"]:has-text("A-Z")',
    sortByCustom: 'div[role="menuitem"]:has-text("Custom")',

    // Toast
    toast: 'div[class*="sonner-toast"], [data-sonner-toast], div[role="status"]',
    toastSuccess: 'div[class*="sonner-success"]',
    toastError: 'div[class*="sonner-error"]',

    // Loading
    loadingSpinner: 'svg.animate-spin',
    loadingText: 'p:has-text("Loading")',
} as const

/**
 * 타임아웃 설정
 */
export const TIMEOUTS = {
    short: 3000,   // 빠른 UI 반응
    medium: 5000,  // 일반적인 API 응답
    long: 10000,   // 느린 네트워크/스캔
} as const

/**
 * 테스트 데이터
 */
export const TEST_DATA = {
    defaultProjectName: 'Test Project',
    defaultProjectPath: '/Users/test/project',
    longName: 'This is a very long project name that should be truncated in the UI display area because it exceeds the maximum width',
    longPath: '/Users/test/very/long/nested/path/to/project/directory/that/exceeds/display/width',
    specialChars: 'test-project_v1.0@latest',
    validPath: '/Users/test/valid-project',
    invalidPath: '/invalid/path/does/not/exist',
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
 * Projects 페이지로 이동 및 로드 대기
 */
export async function navigateToProjectsPage(page: Page): Promise<void> {
    await page.goto('/projects')
    // Projects 헤더가 로드될 때까지 대기
    await expect(page.locator(SELECTORS.listHeader)).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Global Settings 선택
 */
export async function selectGlobalSettings(page: Page): Promise<void> {
    const globalItem = page.locator(SELECTORS.globalItem).first()
    await globalItem.click()
    // Global Configuration이 우측에 표시될 때까지 대기
    await expect(page.locator(SELECTORS.globalConfigTitle).first()).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Project 선택
 */
export async function selectProject(page: Page, name: string): Promise<void> {
    const projectItem = page.locator(SELECTORS.projectItem(name)).first()
    await expect(projectItem).not.toHaveAttribute('aria-disabled', 'true', { timeout: TIMEOUTS.medium })
    await projectItem.click()
    // 선택 상태 확인 (border-primary 클래스)
    await expect(projectItem).toHaveClass(/border-primary/, { timeout: TIMEOUTS.short })
}

/**
 * Project 생성
 */
export async function createProject(
    page: Page,
    name: string,
    path: string = TEST_DATA.defaultProjectPath
): Promise<string> {
    // 모달 열기
    await page.locator(SELECTORS.addButton).click()
    await expect(page.locator(SELECTORS.createModal)).toBeVisible({ timeout: TIMEOUTS.short })

    // 입력
    await page.locator(SELECTORS.pathInput).fill(path)
    await page.locator(SELECTORS.nameInput).fill(name)

    // 생성
    await page.locator(SELECTORS.addProjectButton).click()

    // 토스트 확인
    await expectToast(page, /created|success/i)

    // 모달 닫힘 및 목록에 나타날 때까지 대기
    await expect(page.locator(SELECTORS.createModal)).not.toBeVisible({ timeout: TIMEOUTS.short })
    await expect(page.locator(SELECTORS.projectItem(name)).first()).toBeVisible({
        timeout: TIMEOUTS.medium
    })

    return name
}

/**
 * Project 편집 모달 열기 (드롭다운 메뉴 통해)
 */
export async function openEditModalViaDropdown(page: Page, name: string): Promise<void> {
    const projectItem = page.locator(SELECTORS.projectItem(name)).first()

    // 호버하여 더보기 버튼 표시
    await projectItem.hover()

    // 더보기 버튼 클릭
    await projectItem.locator(SELECTORS.projectMoreButton).click()

    // Edit 메뉴 클릭
    await page.locator(SELECTORS.projectEditMenu).click()

    // 편집 모달 표시 확인
    await expect(page.locator(SELECTORS.editModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Project 편집 모달 열기 (상세 패널의 Edit Project 버튼 통해)
 */
export async function openEditModalViaDetailPanel(page: Page): Promise<void> {
    await page.locator(SELECTORS.editProjectButton).click()
    await expect(page.locator(SELECTORS.editModal)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Project 편집 저장
 */
export async function saveProjectEdit(page: Page, newName?: string, newPath?: string): Promise<void> {
    if (newName) {
        const nameInput = page.locator(SELECTORS.editModal).locator('input').first()
        await nameInput.clear()
        await nameInput.fill(newName)
    }
    if (newPath) {
        const pathInput = page.locator(SELECTORS.editModal).locator('input').nth(1)
        await pathInput.clear()
        await pathInput.fill(newPath)
    }

    await page.locator(SELECTORS.saveChangesButton).click()

    // 토스트 확인
    await expectToast(page, /updated|success/i)

    // 모달 닫힘 확인
    await expect(page.locator(SELECTORS.editModal)).not.toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Project 삭제 (드롭다운 메뉴 통해)
 * window.confirm() 사용하므로 page.on('dialog') 필요
 */
export async function deleteProject(page: Page, name: string): Promise<void> {
    const projectItem = page.locator(SELECTORS.projectItem(name)).first()

    // 호버하여 더보기 버튼 표시
    await projectItem.hover()

    // 더보기 버튼 클릭
    await projectItem.locator(SELECTORS.projectMoreButton).click()

    // confirm 다이얼로그 자동 수락 설정
    page.once('dialog', dialog => dialog.accept())

    // Delete 메뉴 클릭
    await page.locator(SELECTORS.projectDeleteMenu).click()

    // 토스트 확인
    await expectToast(page, /deleted|success/i)

    // 목록에서 제거 확인
    await expect(page.locator(SELECTORS.projectItem(name))).not.toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Project 삭제 취소
 */
export async function cancelDeleteProject(page: Page, name: string): Promise<void> {
    const projectItem = page.locator(SELECTORS.projectItem(name)).first()

    // 호버하여 더보기 버튼 표시
    await projectItem.hover()

    // 더보기 버튼 클릭
    await projectItem.locator(SELECTORS.projectMoreButton).click()

    // confirm 다이얼로그 거부 설정
    page.once('dialog', dialog => dialog.dismiss())

    // Delete 메뉴 클릭
    await page.locator(SELECTORS.projectDeleteMenu).click()

    // Project가 여전히 존재하는지 확인
    await expect(projectItem).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * 스캔 실행
 */
export async function scanProjects(page: Page): Promise<void> {
    await page.locator(SELECTORS.scanButton).click()

    // 로딩 스피너 확인 (애니메이션)
    await expect(page.locator(SELECTORS.loadingSpinner).first()).toBeVisible({ timeout: TIMEOUTS.short })

    // 스캔 완료 토스트 대기
    await expectToast(page, /scan complete|found/i)
}

/**
 * 토스트 메시지 확인
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
    const toastContainer = page.locator('[data-sonner-toast], div[role="status"], .toast, [class*="Toaster"] div, div[class*="sonner-toast"]')
    const toastWithMessage = toastContainer.filter({ hasText: message })
    await expect(toastWithMessage.first()).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Project 목록에 특정 Project가 존재하는지 확인
 */
export async function expectProjectInList(page: Page, name: string, shouldExist: boolean = true): Promise<void> {
    const projectItem = page.locator(SELECTORS.projectItem(name)).first()
    if (shouldExist) {
        await expect(projectItem).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(projectItem).not.toBeVisible({ timeout: TIMEOUTS.medium })
    }
}

/**
 * 상세 패널에 특정 내용이 표시되는지 확인
 */
export async function expectDetailPanelContent(page: Page, content: string | RegExp): Promise<void> {
    const detailPanel = page.locator('div.flex-1.flex.flex-col.h-full')
    await expect(detailPanel).toContainText(content, { timeout: TIMEOUTS.short })
}

/**
 * 테스트 후 정리 (생성된 Project 삭제)
 */
export async function cleanupProject(page: Page, name: string): Promise<void> {
    try {
        const projectItem = page.locator(SELECTORS.projectItem(name)).first()
        if (await projectItem.isVisible({ timeout: 1000 })) {
            await deleteProject(page, name)
        }
    } catch {
        // 이미 삭제되었거나 존재하지 않음 - 무시
    }
}

/**
 * Create 모달 닫기
 */
export async function closeCreateModal(page: Page): Promise<void> {
    const modal = page.locator(SELECTORS.createModal)
    if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
        await page.locator(SELECTORS.cancelButton).click()
        await expect(modal).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * Edit 모달 닫기
 */
export async function closeEditModal(page: Page): Promise<void> {
    const modal = page.locator(SELECTORS.editModal)
    if (await modal.isVisible({ timeout: 500 }).catch(() => false)) {
        await modal.locator('button:has-text("Cancel")').click()
        await expect(modal).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

// API Helpers removed per user request for pure UI testing
