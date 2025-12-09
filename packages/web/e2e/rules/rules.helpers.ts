/**
 * Rules E2E 테스트 헬퍼
 * 공통 셀렉터, 타임아웃, 유틸리티 함수 정의
 */
import { Page, expect } from '@playwright/test'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 셀렉터 정의
 * 현재 RulesPage.tsx의 실제 DOM 구조 기반
 * TODO: 향후 data-testid 추가 시 업데이트 필요
 */
export const SELECTORS = {
    // 목록 영역
    rulesPanel: '.w-80', // 좌측 Rules 목록 패널
    ruleItem: (name: string) => `div.group:has-text("${name}")`,
    dragHandle: '.cursor-grab',
    deleteButton: 'button[title="Delete"]',
    addButton: 'button:has(svg.lucide-plus)',

    // 에디터 영역
    editorPanel: '.flex-1.flex.flex-col.h-full', // 우측 에디터 패널
    editButton: 'button:has-text("Edit")',
    saveButton: 'button:has-text("Save")',
    cancelButton: 'button:has-text("Cancel")',
    editorContent: 'pre',

    // 생성 모달
    createModal: 'div[role="dialog"]:has-text("Create New Rule")',
    nameInput: 'input#ruleName',
    contentTextarea: 'textarea#ruleContent',
    createButton: 'button:has-text("Create")',
    modalCancelButton: 'div[role="dialog"] button:has-text("Cancel")',

    // 삭제 확인 다이얼로그
    deleteDialog: 'div[role="dialog"]:has-text("Delete Rule")',
    confirmDeleteButton: 'div[role="dialog"]:has-text("Delete Rule") button:has-text("Delete")',
    cancelDeleteButton: 'div[role="dialog"]:has-text("Delete Rule") button:has-text("Cancel")',

    // 편집 모드
    editNameInput: 'input#ruleName',
    editContentTextarea: 'textarea',

    // 토스트 메시지
    toast: '[data-sonner-toast], [role="status"]',
} as const

/**
 * 타임아웃 설정
 */
export const TIMEOUTS = {
    short: 3000,   // 빠른 UI 반응
    medium: 5000,  // 일반적인 API 응답
    long: 10000,   // 느린 네트워크/동기화
} as const

/**
 * 테스트 데이터
 */
export const TEST_DATA = {
    defaultContent: '# Test Rule Content\n\nThis is test content for E2E testing.',
    updatedContent: '# Updated Content\n\nThis content was updated during testing.',
    longName: 'This is a very long rule name that should be truncated in the UI display area',
    specialChars: '!@#$%^&*()',
    xssAttempt: '<script>alert("xss")</script>',
} as const

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * 고유한 Rule 이름 생성
 * 병렬 실행 시 충돌 방지를 위해 타임스탬프 + 랜덤 문자열 사용
 */
export function generateUniqueName(prefix: string = 'Test Rule'): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix} ${timestamp}-${random}`
}

/**
 * Rules 페이지로 이동 및 로드 대기
 */
export async function navigateToRulesPage(page: Page): Promise<void> {
    await page.goto('/rules')
    await page.waitForLoadState('networkidle')
}

/**
 * Rule 생성
 * @returns 생성된 Rule 이름
 */
export async function createRule(
    page: Page,
    name: string,
    content: string = TEST_DATA.defaultContent
): Promise<string> {
    // 모달 열기
    await page.locator(SELECTORS.addButton).click()
    await expect(page.locator(SELECTORS.createModal)).toBeVisible({ timeout: TIMEOUTS.short })

    // 입력
    await page.fill(SELECTORS.nameInput, name)
    await page.fill(SELECTORS.contentTextarea, content)

    // 생성
    await page.locator(SELECTORS.createButton).click()

    // 목록에 나타날 때까지 대기
    await expect(page.locator(SELECTORS.ruleItem(name)).first()).toBeVisible({
        timeout: TIMEOUTS.medium
    })

    return name
}

/**
 * Rule 선택 (목록에서 클릭)
 */
export async function selectRule(page: Page, name: string): Promise<void> {
    const ruleItem = page.locator(SELECTORS.ruleItem(name)).first()
    await ruleItem.click()
    // 선택 상태 확인 (border-primary 클래스)
    await expect(ruleItem).toHaveClass(/border-primary/, { timeout: TIMEOUTS.short })
}

/**
 * Rule 삭제 (확인 다이얼로그 포함)
 */
export async function deleteRule(page: Page, name: string): Promise<void> {
    const ruleItem = page.locator(SELECTORS.ruleItem(name)).first()

    // 호버하여 삭제 버튼 표시
    await ruleItem.hover()

    // 삭제 버튼 클릭
    await ruleItem.locator(SELECTORS.deleteButton).click()

    // 확인 다이얼로그 대기
    await expect(page.locator(SELECTORS.deleteDialog)).toBeVisible({ timeout: TIMEOUTS.short })

    // 삭제 확인
    await page.locator(SELECTORS.confirmDeleteButton).click()

    // 다이얼로그 닫힘 및 목록에서 제거 확인
    await expect(page.locator(SELECTORS.deleteDialog)).not.toBeVisible({ timeout: TIMEOUTS.short })
    await expect(page.locator(SELECTORS.ruleItem(name))).not.toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Rule 편집 모드 진입
 */
export async function enterEditMode(page: Page): Promise<void> {
    await page.locator(SELECTORS.editButton).click()
    await expect(page.locator(SELECTORS.saveButton)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * Rule 편집 후 저장
 */
export async function saveEdit(page: Page): Promise<void> {
    await page.locator(SELECTORS.saveButton).click()
    // 저장 후 읽기 모드로 복귀 확인
    await expect(page.locator(SELECTORS.editButton)).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Rule 편집 취소
 */
export async function cancelEdit(page: Page): Promise<void> {
    await page.locator(SELECTORS.cancelButton).click()
    await expect(page.locator(SELECTORS.editButton)).toBeVisible({ timeout: TIMEOUTS.short })
}

/**
 * 토스트 메시지 확인
 * Sonner는 [data-sonner-toast] 속성을 가진 요소로 토스트 표시
 */
export async function expectToast(page: Page, message: string | RegExp): Promise<void> {
    // Sonner 토스트 셀렉터 (fallback 포함)
    const toastContainer = page.locator('[data-sonner-toast], div[role="status"], .toast, [class*="Toaster"] div')
    const toastWithMessage = toastContainer.filter({ hasText: message })

    // 토스트가 여러 개 있을 수 있으므로 first() 사용
    await expect(toastWithMessage.first()).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * Rule 목록에 특정 Rule이 존재하는지 확인
 */
export async function expectRuleInList(page: Page, name: string, shouldExist: boolean = true): Promise<void> {
    const ruleItem = page.locator(SELECTORS.ruleItem(name)).first()
    if (shouldExist) {
        await expect(ruleItem).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(ruleItem).not.toBeVisible({ timeout: TIMEOUTS.medium })
    }
}

/**
 * 에디터에 특정 내용이 표시되는지 확인
 */
export async function expectEditorContent(page: Page, content: string | RegExp): Promise<void> {
    const editor = page.locator(SELECTORS.editorContent)
    await expect(editor).toContainText(content, { timeout: TIMEOUTS.short })
}

/**
 * 테스트 후 정리 (생성된 Rule 삭제)
 * 테스트 실패 시에도 cleanup 시도
 */
export async function cleanupRule(page: Page, name: string): Promise<void> {
    try {
        const ruleItem = page.locator(SELECTORS.ruleItem(name)).first()
        if (await ruleItem.isVisible({ timeout: 1000 })) {
            await deleteRule(page, name)
        }
    } catch {
        // 이미 삭제되었거나 존재하지 않음 - 무시
    }
}
