/**
 * Projects Validation E2E Tests - P0/P1
 * 유효성 검증 및 에러 처리 테스트
 *
 * @priority P0-P1
 * @scenarios P-013 ~ P-016
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    generateUniqueName,
    navigateToProjectsPage,
    expectToast,
    closeCreateModal,
} from './projects.helpers'

test.describe('Projects Validation - P0 @priority-p0', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-013: 필수 필드 누락 검증
    // ========================================================================
    test('P-013: should validate required fields - empty Path', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Name만 입력하고 Path는 비워둠
        await page.locator(SELECTORS.nameInput).fill('Test Project')
        // Path는 입력하지 않음

        // Add Project 버튼 클릭
        await page.locator(SELECTORS.addProjectButton).click()

        // 에러 토스트 메시지 확인
        await expectToast(page, /required|path|empty/i)

        // 모달이 닫히지 않고 유지되는지 확인
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Cleanup
        await closeCreateModal(page)
    })

    test('P-013b: should validate required fields - empty Name', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Path만 입력하고 Name은 비워둠
        await page.locator(SELECTORS.pathInput).fill('/Users/test/project')
        // Name은 입력하지 않음

        // Add Project 버튼 클릭
        await page.locator(SELECTORS.addProjectButton).click()

        // 에러 토스트 메시지 확인
        await expectToast(page, /required|name|empty/i)

        // 모달이 닫히지 않고 유지되는지 확인
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Cleanup
        await closeCreateModal(page)
    })

    test('P-013c: should validate required fields - both empty', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // 둘 다 비워둠

        // Add Project 버튼 클릭
        await page.locator(SELECTORS.addProjectButton).click()

        // 에러 토스트 메시지 확인
        await expectToast(page, /required/i)

        // 모달이 닫히지 않고 유지되는지 확인
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Cleanup
        await closeCreateModal(page)
    })
})

test.describe('Projects Validation - P1 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-014: 잘못된 경로 입력
    // ========================================================================
    test('P-014: should handle invalid path input', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // 존재하지 않는 경로 입력
        await page.locator(SELECTORS.pathInput).fill(TEST_DATA.invalidPath)
        await page.locator(SELECTORS.nameInput).fill('Invalid Path Project')

        // Add Project 버튼 클릭
        await page.locator(SELECTORS.addProjectButton).click()

        // 비즈니스 로직에 따라 다르게 동작:
        // 1. 서버가 경로 유효성 검증 수행 -> 에러 메시지
        // 2. 경로 검증 없이 생성 성공
        // 현재 구현에 맞게 확인

        // 토스트 메시지 확인 (성공 또는 에러)
        const toastContainer = page.locator('[data-sonner-toast], div[role="status"], div[class*="sonner-toast"]')
        await expect(toastContainer.first()).toBeVisible({ timeout: TIMEOUTS.medium })

        // Cleanup - 성공적으로 생성된 경우에만
        await closeCreateModal(page).catch(() => {})
        const projectItem = page.locator(SELECTORS.projectItem('Invalid Path Project')).first()
        if (await projectItem.isVisible({ timeout: 1000 }).catch(() => false)) {
            // 삭제 수행
            await projectItem.hover()
            await projectItem.locator(SELECTORS.projectMoreButton).click()
            page.once('dialog', dialog => dialog.accept())
            await page.locator(SELECTORS.projectDeleteMenu).click()
        }
    })
})

test.describe('Projects Error Handling - P1 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-015: Project 생성 실패
    // ========================================================================
    test('P-015: should show error toast on create failure', async ({ page, context }) => {
        // API 요청을 가로채서 에러 응답 반환
        await page.route('**/api/projects', async (route) => {
            if (route.request().method() === 'POST') {
                await route.fulfill({
                    status: 500,
                    contentType: 'application/json',
                    body: JSON.stringify({ error: 'Internal Server Error' })
                })
            } else {
                await route.continue()
            }
        })

        // 모달 열기
        await page.locator(SELECTORS.addButton).click()

        // 유효한 데이터 입력
        await page.locator(SELECTORS.pathInput).fill('/Users/test/error-project')
        await page.locator(SELECTORS.nameInput).fill('Error Test Project')

        // Add Project 버튼 클릭
        await page.locator(SELECTORS.addProjectButton).click()

        // 에러 토스트 메시지 확인
        await expectToast(page, /failed|error/i)

        // 모달이 유지되는지 확인 (재시도 가능)
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // 입력한 데이터가 유지되는지 확인
        await expect(page.locator(SELECTORS.pathInput)).toHaveValue('/Users/test/error-project')
        await expect(page.locator(SELECTORS.nameInput)).toHaveValue('Error Test Project')

        // Cleanup
        await closeCreateModal(page)
    })

    // ========================================================================
    // P-016: Project 스캔 실패
    // ========================================================================
    test('P-016: should show error toast on scan failure', async ({ page }) => {
        // API 요청을 가로채서 스캔 에러 응답 반환
        await page.route('**/api/projects/scan', async (route) => {
            await route.fulfill({
                status: 500,
                contentType: 'application/json',
                body: JSON.stringify({ error: 'Scan failed' })
            })
        })

        // 스캔 버튼 클릭
        await page.locator(SELECTORS.scanButton).click()

        // 에러 토스트 메시지 확인
        await expectToast(page, /scan failed|error/i)

        // 기존 목록이 유지되는지 확인
        // Global Settings가 여전히 존재해야 함
        await expect(page.locator(SELECTORS.globalItem).first()).toBeVisible()
    })
})
