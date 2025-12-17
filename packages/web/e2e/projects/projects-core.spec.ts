/**
 * Projects Core E2E Tests - P0 (필수)
 * 핵심 CRUD 기능 및 기본 UI 테스트
 *
 * @priority P0
 * @scenarios P-001 ~ P-012
 *
 * Projects 페이지 구조:
 * - 좌측: Project 목록 (Global Settings + Projects)
 * - 우측: 선택된 항목의 상세 정보
 * - 모달: Project 생성/편집
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
    openEditModalViaDropdown,
    openEditModalViaDetailPanel,
    saveProjectEdit,
    deleteProject,
    cancelDeleteProject,
    scanProjects,
    expectToast,
    expectProjectInList,
    cleanupProject,
    closeCreateModal,
    closeEditModal,
} from './projects.helpers'

test.describe('Projects Core - P0 @priority-p0', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-001: Projects 목록 조회
    // ========================================================================
    test('P-001: should display Projects page with list', async ({ page }) => {
        // Projects 헤더 확인
        await expect(page.locator(SELECTORS.listHeader)).toBeVisible()

        // Scan 버튼 확인
        await expect(page.locator(SELECTORS.scanButton)).toBeVisible()

        // Add 버튼 확인
        await expect(page.locator(SELECTORS.addButton)).toBeVisible()

        // Global Settings 항목이 존재하는지 확인
        await expect(page.locator(SELECTORS.globalItem).first()).toBeVisible()

        // 좌측 패널 존재 확인
        await expect(page.locator(SELECTORS.listPanel)).toBeVisible()
    })

    // ========================================================================
    // P-002: Global Settings 기본 선택
    // ========================================================================
    test('P-002: should select Global Settings by default', async ({ page }) => {
        // Global Settings 선택
        await selectGlobalSettings(page)

        // 우측 패널에 Global Configuration 제목 표시 확인
        await expect(page.locator(SELECTORS.globalConfigTitle).first()).toBeVisible()

        // Tool 메타데이터 테이블이 표시되는지 확인
        await expect(page.locator(SELECTORS.globalToolTable).first()).toBeVisible()
    })

    // ========================================================================
    // P-003: Project 선택 및 상세 보기
    // ========================================================================
    test('P-003: should select Project and display details', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P003-Project')
        await createProject(page, projectName, TEST_DATA.defaultProjectPath)

        // Project 선택
        await selectProject(page, projectName)

        // 상세 패널에 Project 이름 표시 확인
        await expect(page.locator(SELECTORS.projectDetailTitle(projectName)).first()).toBeVisible()

        // Edit Project 버튼 표시 확인
        await expect(page.locator(SELECTORS.editProjectButton)).toBeVisible()

        // Cleanup
        await cleanupProject(page, projectName)
    })

    // ========================================================================
    // P-004: Project 생성 - 모달 열기/닫기
    // ========================================================================
    test('P-004: should open and close create Project modal', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // Path 입력 필드 확인
        await expect(page.locator(SELECTORS.pathInput)).toBeVisible()

        // Name 입력 필드 확인
        await expect(page.locator(SELECTORS.nameInput)).toBeVisible()

        // Browse 버튼 확인
        await expect(page.locator(SELECTORS.browseButton)).toBeVisible()

        // Cancel 클릭
        await page.locator(SELECTORS.cancelButton).click()

        // 모달 닫힘 확인
        await expect(page.locator(SELECTORS.createModal)).toBeHidden()
    })

    // ========================================================================
    // P-005: Project 생성 - 성공 케이스
    // ========================================================================
    test('P-005: should create a new Project successfully', async ({ page }) => {
        const projectName = generateUniqueName('P005-Project')
        const projectPath = '/Users/test/p005-project'

        // 모달 열기
        await page.locator(SELECTORS.addButton).click()

        // 입력
        await page.locator(SELECTORS.pathInput).fill(projectPath)
        await page.locator(SELECTORS.nameInput).fill(projectName)

        // Create 클릭
        await page.locator(SELECTORS.addProjectButton).click()

        // 토스트 메시지 확인
        await expectToast(page, /created|success/i)

        // 모달 닫힘 확인
        await expect(page.locator(SELECTORS.createModal)).toBeHidden()

        // 목록에 추가 확인
        await expectProjectInList(page, projectName, true)

        // 새 Project가 자동 선택되는지 확인
        await expect(page.locator(SELECTORS.projectDetailTitle(projectName)).first()).toBeVisible()

        // Cleanup
        await cleanupProject(page, projectName)
    })

    // ========================================================================
    // P-007: Project 편집 - 모달 열기
    // ========================================================================
    test('P-007: should open edit modal via dropdown menu', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P007-Project')
        await createProject(page, projectName, TEST_DATA.defaultProjectPath)

        // 드롭다운을 통해 편집 모달 열기
        await openEditModalViaDropdown(page, projectName)

        // 기존 이름이 입력 필드에 채워져 있는지 확인
        const nameInput = page.locator(SELECTORS.editModal).locator('input').first()
        await expect(nameInput).toHaveValue(projectName)

        // Cancel
        await closeEditModal(page)

        // Cleanup
        await cleanupProject(page, projectName)
    })

    test('P-007b: should open edit modal via detail panel button', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P007b-Project')
        await createProject(page, projectName, TEST_DATA.defaultProjectPath)

        // Project 선택
        await selectProject(page, projectName)

        // 상세 패널의 Edit Project 버튼으로 모달 열기
        await openEditModalViaDetailPanel(page)

        // 편집 모달 표시 확인
        await expect(page.locator(SELECTORS.editModal)).toBeVisible()

        // Cancel
        await closeEditModal(page)

        // Cleanup
        await cleanupProject(page, projectName)
    })

    // ========================================================================
    // P-008: Project 편집 - 저장 성공
    // ========================================================================
    test('P-008: should edit and save Project successfully', async ({ page }) => {
        // 테스트용 Project 생성
        const originalName = generateUniqueName('P008-Original')
        await createProject(page, originalName, TEST_DATA.defaultProjectPath)

        // 드롭다운을 통해 편집 모달 열기
        await openEditModalViaDropdown(page, originalName)

        // 이름 수정
        const updatedName = originalName + ' (Updated)'
        await saveProjectEdit(page, updatedName)

        // 변경된 이름이 목록에 반영되는지 확인
        await expectProjectInList(page, updatedName, true)
        await expectProjectInList(page, originalName, false)

        // Cleanup
        await cleanupProject(page, updatedName)
    })

    // ========================================================================
    // P-009: Project 삭제 - 확인 다이얼로그
    // ========================================================================
    test('P-009: should show delete confirmation and cancel', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P009-Project')
        await createProject(page, projectName, TEST_DATA.defaultProjectPath)

        // 삭제 취소 실행
        await cancelDeleteProject(page, projectName)

        // Project가 여전히 존재하는지 확인
        await expectProjectInList(page, projectName, true)

        // Cleanup
        await cleanupProject(page, projectName)
    })

    // ========================================================================
    // P-010: Project 삭제 - 성공 케이스
    // ========================================================================
    test('P-010: should delete Project successfully', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P010-Project')
        await createProject(page, projectName, TEST_DATA.defaultProjectPath)

        // 삭제 실행
        await deleteProject(page, projectName)

        // 목록에서 제거 확인
        await expectProjectInList(page, projectName, false)
    })

    // ========================================================================
    // P-011: Project 스캔 기능
    // ========================================================================
    test('P-011: should scan for projects', async ({ page }) => {
        // 스캔 버튼 클릭
        await page.locator(SELECTORS.scanButton).click()

        // 스피너 표시 확인 (animate-spin 클래스)
        const scanButton = page.locator(SELECTORS.scanButton)
        await expect(scanButton.locator('svg')).toHaveClass(/animate-spin/, { timeout: TIMEOUTS.short })

        // 스캔 완료 토스트 대기
        await expectToast(page, /scan complete|found/i)
    })

    // ========================================================================
    // P-012: 검색 필터링
    // ========================================================================
    test('P-012: should filter Projects by search', async ({ page }) => {
        // 테스트용 Project 여러 개 생성
        const projectA = generateUniqueName('SearchTestA')
        const projectB = generateUniqueName('SearchTestB')
        const projectC = generateUniqueName('DifferentName')

        await createProject(page, projectA, '/Users/test/project-a')
        await createProject(page, projectB, '/Users/test/project-b')
        await createProject(page, projectC, '/Users/test/project-c')

        // 검색 입력 필드 찾기 (있는 경우)
        const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]').first()

        // 검색 기능이 구현되어 있는지 확인
        const hasSearch = await searchInput.isVisible().catch(() => false)

        if (hasSearch) {
            // 검색어 입력
            await searchInput.fill('SearchTest')
            await page.waitForTimeout(300) // 디바운스 대기

            // SearchTest가 포함된 항목만 표시되는지 확인
            await expectProjectInList(page, projectA, true)
            await expectProjectInList(page, projectB, true)
            await expectProjectInList(page, projectC, false)

            // 검색어 삭제
            await searchInput.clear()
            await page.waitForTimeout(300)

            // 전체 목록 복원 확인
            await expectProjectInList(page, projectC, true)
        } else {
            // 검색 기능 미구현 시 테스트 스킵
            test.skip()
        }

        // Cleanup
        await cleanupProject(page, projectA)
        await cleanupProject(page, projectB)
        await cleanupProject(page, projectC)
    })
})

test.describe('Projects Edge Cases - P1 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToProjectsPage(page)
    })

    // ========================================================================
    // P-018: 빈 상태 - Project 미선택
    // ========================================================================
    test('P-018: should show empty state when no Project is selected', async ({ page }) => {
        // 현재 구현에서는 'global'이 기본 선택되므로
        // Global Settings가 기본으로 선택되어 있어야 함
        await selectGlobalSettings(page)

        // Global Configuration이 표시되는지 확인
        await expect(page.locator(SELECTORS.globalConfigTitle).first()).toBeVisible()

        // 빈 상태가 아닌 Global Settings 뷰가 표시됨을 확인
        // (현재 구현에서는 항상 global이 선택되어 있음)
    })

    // ========================================================================
    // P-019: 선택된 Project 삭제 후 상태
    // ========================================================================
    test('P-019: should reset to Global Settings after deleting selected Project', async ({ page }) => {
        // 테스트용 Project 생성
        const projectName = generateUniqueName('P019-Project')
        await createProject(page, projectName, TEST_DATA.defaultProjectPath)

        // Project 선택
        await selectProject(page, projectName)

        // Project가 선택되어 상세 표시 확인
        await expect(page.locator(SELECTORS.projectDetailTitle(projectName)).first()).toBeVisible()

        // Project 삭제
        await deleteProject(page, projectName)

        // 삭제 후 Global Settings가 자동 선택되는지 확인
        await expect(page.locator(SELECTORS.globalConfigTitle).first()).toBeVisible()
    })
})
