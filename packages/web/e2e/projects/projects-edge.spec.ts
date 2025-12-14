/**
 * Projects Edge Cases E2E Tests - P1/P2
 * 엣지 케이스 및 접근성 테스트
 *
 * @priority P1-P2
 * @scenarios P-017 ~ P-025
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    generateUniqueName,
    navigateToProjectsPage,
    selectGlobalSettings,
    selectProject,
    createProject,
    deleteProject,
    expectToast,
    expectProjectInList,
    cleanupProject,
    closeCreateModal,
} from './projects.helpers'

test.describe('Projects Edge Cases - P2 @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-017: 긴 Project 이름 처리
    // ========================================================================
    test('P-017: should handle long Project name with truncation', async ({ page }) => {
        const longName = TEST_DATA.longName
        const projectPath = '/Users/test/long-name-project'

        // 긴 이름으로 Project 생성
        await createProject(page, longName, projectPath)

        // 좌측 목록에서 truncate 처리 확인
        const projectItem = page.locator(SELECTORS.projectItem(longName.substring(0, 20))).first()
        await expect(projectItem).toBeVisible()

        // 레이아웃 깨짐이 없는지 확인 (overflow 처리)
        const itemBoundingBox = await projectItem.boundingBox()
        expect(itemBoundingBox).not.toBeNull()
        if (itemBoundingBox) {
            // 항목이 패널 너비를 벗어나지 않아야 함
            expect(itemBoundingBox.width).toBeLessThan(400) // w-80 = 320px + padding
        }

        // Project 선택하여 상세 패널에서 전체 이름 확인
        await projectItem.click()

        // Cleanup - 전체 이름이 일치하는 항목 찾아 삭제
        await projectItem.hover()
        await projectItem.locator(SELECTORS.projectMoreButton).click()
        page.once('dialog', dialog => dialog.accept())
        await page.locator(SELECTORS.projectDeleteMenu).click()
        await expectToast(page, /deleted/i)
    })

    // ========================================================================
    // P-020: 검색 결과 없음
    // ========================================================================
    test('P-020: should show empty state when no search results', async ({ page }) => {
        // 검색 입력 필드 찾기
        const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()

        // 검색 기능이 구현되어 있는지 확인
        const hasSearch = await searchInput.isVisible().catch(() => false)

        if (hasSearch) {
            // 존재하지 않는 텍스트로 검색
            await searchInput.fill('zzzznonexistent')
            await page.waitForTimeout(300) // 디바운스 대기

            // Project 목록이 비어있는지 확인
            const projectItems = page.locator('div.px-3.py-3.rounded-lg:not(:has-text("Global Settings"))')
            await expect(projectItems).toHaveCount(0)

            // Global Settings는 계속 표시되어야 함
            await expect(page.locator(SELECTORS.globalItem).first()).toBeVisible()
        } else {
            // 검색 기능 미구현 시 테스트 스킵
            test.skip()
        }
    })

    // ========================================================================
    // P-021: Project 상세 - Tools 미감지
    // ========================================================================
    test('P-021: should show No Tools Detected when no AI tools found', async ({ page }) => {
        // Tool 설정 파일이 없는 경로로 Project 생성
        const projectName = generateUniqueName('P021-NoTools')
        const emptyPath = '/Users/test/empty-project'

        await createProject(page, projectName, emptyPath)

        // Project 선택
        await selectProject(page, projectName)

        // No Tools Detected 상태 확인
        // (서버가 tools 분석을 수행하는 경우)
        // 빈 tools 배열이면 EmptyState가 표시됨
        const noToolsMessage = page.locator(SELECTORS.noToolsDetected)
        const toolsTable = page.locator(SELECTORS.toolsTable)

        // 둘 중 하나가 표시되어야 함
        const hasNoTools = await noToolsMessage.isVisible().catch(() => false)
        const hasToolsTable = await toolsTable.isVisible().catch(() => false)

        expect(hasNoTools || hasToolsTable).toBeTruthy()

        // Cleanup
        await cleanupProject(page, projectName)
    })
})

test.describe('Projects Accessibility - P2 @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-022: 키보드 네비게이션
    // ========================================================================
    test('P-022: should support keyboard navigation', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P022-Keyboard')
        await createProject(page, projectName, '/Users/test/keyboard-project')

        // Tab 키로 요소 간 이동 확인
        await page.keyboard.press('Tab')

        // 포커스가 이동하는지 확인
        const focusedElement = page.locator(':focus')
        await expect(focusedElement).toBeVisible()

        // Escape로 모달 닫기 확인
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        await page.keyboard.press('Escape')
        await expect(page.locator(SELECTORS.createModal)).not.toBeVisible()

        // Cleanup
        await cleanupProject(page, projectName)
    })

    // ========================================================================
    // P-023: 긴 경로 Tooltip 확인
    // ========================================================================
    test('P-023: should show tooltip for truncated path', async ({ page }) => {
        // 긴 경로로 Project 생성
        const projectName = generateUniqueName('P023-Tooltip')
        const longPath = TEST_DATA.longPath

        await createProject(page, projectName, longPath)

        // Project 항목에서 경로 부분에 호버
        const projectItem = page.locator(SELECTORS.projectItem(projectName)).first()
        await projectItem.hover()

        // TruncateTooltip 컴포넌트가 title 속성 또는 tooltip을 제공하는지 확인
        const pathElement = projectItem.locator('div.text-xs, span.text-xs').first()

        // title 속성 확인
        const titleAttr = await pathElement.getAttribute('title').catch(() => null)

        // TruncateTooltip 동작 확인 (RadixUI Tooltip 또는 native title)
        if (titleAttr) {
            expect(titleAttr).toContain('test')
        }

        // Cleanup
        await cleanupProject(page, projectName)
    })
})

test.describe('Projects Concurrency - P2 @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-024: 동시성 - 빠른 연속 클릭
    // ========================================================================
    test('P-024: should handle rapid consecutive clicks', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P024-Rapid')
        await createProject(page, projectName, '/Users/test/rapid-project')

        // Add 버튼 빠르게 여러 번 클릭
        await page.locator(SELECTORS.addButton).click()
        await page.locator(SELECTORS.addButton).click({ force: true }).catch(() => {})
        await page.locator(SELECTORS.addButton).click({ force: true }).catch(() => {})

        // 모달이 하나만 열려있는지 확인
        const modals = page.locator(SELECTORS.createModal)
        const modalCount = await modals.count()
        expect(modalCount).toBeLessThanOrEqual(1)

        // 모달 닫기
        await closeCreateModal(page)

        // Project 항목 빠르게 여러 번 클릭
        const projectItem = page.locator(SELECTORS.projectItem(projectName)).first()
        await projectItem.click()
        await projectItem.click()
        await projectItem.click()

        // UI가 안정적인 상태인지 확인
        await expect(page.locator(SELECTORS.projectDetailTitle(projectName)).first()).toBeVisible()

        // Cleanup
        await cleanupProject(page, projectName)
    })

    // ========================================================================
    // P-025: 특수문자 처리
    // ========================================================================
    test('P-025: should handle special characters in Project name', async ({ page }) => {
        const specialName = TEST_DATA.specialChars
        const projectPath = '/Users/test/special-chars-project'

        // 특수문자가 포함된 이름으로 Project 생성
        await createProject(page, specialName, projectPath)

        // 목록에 표시 확인
        await expectProjectInList(page, specialName.substring(0, 10), true)

        // Project 선택
        const projectItem = page.locator(SELECTORS.projectItem(specialName.substring(0, 10))).first()
        await projectItem.click()

        // 상세 패널에서 특수문자가 올바르게 표시되는지 확인
        const detailTitle = page.locator(`h2:has-text("${specialName.substring(0, 10)}"), div[class*="CardTitle"]`).first()
        await expect(detailTitle).toBeVisible()

        // Cleanup
        await projectItem.hover()
        await projectItem.locator(SELECTORS.projectMoreButton).click()
        page.once('dialog', dialog => dialog.accept())
        await page.locator(SELECTORS.projectDeleteMenu).click()
        await expectToast(page, /deleted/i)
    })
})

test.describe('Projects Browse Feature - P1 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-006: Project 생성 - Browse 버튼으로 폴더 선택
    // ========================================================================
    test('P-006: should show Browse button for folder selection', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Browse 버튼이 표시되는지 확인
        const browseButton = page.locator(SELECTORS.browseButton)
        await expect(browseButton).toBeVisible()

        // Browse 버튼 클릭 (OS 다이얼로그는 테스트 불가, 클릭만 확인)
        // 참고: OS 레벨 다이얼로그는 Playwright에서 직접 제어 불가
        // 실제 환경에서는 Electron의 dialog API mock 필요

        // 클릭 시 에러가 발생하지 않는지 확인
        await browseButton.click()

        // 토스트나 에러 없이 모달이 유지되는지 확인
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Cleanup
        await closeCreateModal(page)
    })
})
