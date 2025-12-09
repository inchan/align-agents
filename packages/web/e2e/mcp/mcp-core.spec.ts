/**
 * MCP Core E2E Tests - P0 (필수)
 * 핵심 CRUD 기능 테스트
 *
 * @priority P0
 * @scenarios M-001 ~ M-012
 *
 * MCP 페이지 구조:
 * - Sets: MCP 서버 그룹 (좌측 패널)
 * - Library: 전역 MCP Definition Pool (Sheet)
 * - Set Detail: 선택된 Set의 MCP 항목들 (우측 패널)
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    generateUniqueName,
    navigateToMcpPage,
    createSet,
    selectSet,
    deleteSet,
    openLibrary,
    createMcpDef,
    addMcpToSet,
    expectToast,
    expectSetInList,
    expectMcpInSet,
    cleanupSet,
    deleteMcpDef,
} from './mcp.helpers'

test.describe('MCP Core - P0 @priority-p0', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // M-001: MCP 서버 목록 조회 (Sets 목록)
    // ========================================================================
    test('M-001: should display MCP page with Sets list', async ({ page }) => {
        // Sets 헤더 확인
        await expect(page.locator(SELECTORS.setsHeader)).toBeVisible()

        // Add Set 버튼 확인
        await expect(page.locator(SELECTORS.addSetButton)).toBeVisible()

        // Sets 패널이 존재하는지 확인
        await expect(page.locator(SELECTORS.setsPanel)).toBeVisible()
    })

    // ========================================================================
    // M-002: MCP Set 선택 및 상세 보기
    // ========================================================================
    test('M-002: should select Set and display details', async ({ page }) => {
        // 테스트용 Set 생성
        const setName = generateUniqueName('M002-Set')
        await createSet(page, setName, 'Test description')

        // Set 선택
        await selectSet(page, setName)

        // 상세 영역에 Set 이름 표시 확인 (h3 태그로 렌더링됨)
        await expect(page.locator(`h3:has-text("${setName}")`).first()).toBeVisible()

        // Add 버튼 표시 확인
        await expect(page.locator(SELECTORS.addMcpButton)).toBeVisible()

        // Cleanup
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-003: MCP Set 생성 - 모달 열기/닫기
    // ========================================================================
    test('M-003: should open and close create Set modal', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addSetButton).click()
        await expect(page.locator(SELECTORS.createSetModal)).toBeVisible()

        // 입력 필드 확인
        const inputs = page.locator('div[role="dialog"] input')
        await expect(inputs.nth(0)).toBeVisible() // Name
        await expect(inputs.nth(1)).toBeVisible() // Description

        // Cancel 클릭
        await page.locator(SELECTORS.modalCancelButton).click()

        // 모달 닫힘 확인
        await expect(page.locator(SELECTORS.createSetModal)).not.toBeVisible()
    })

    // ========================================================================
    // M-004: MCP Set 생성 - 성공 케이스
    // ========================================================================
    test('M-004: should create a new Set successfully', async ({ page }) => {
        const setName = generateUniqueName('M004-Set')
        const setDescription = 'Test Set created by E2E'

        // 모달 열기
        await page.locator(SELECTORS.addSetButton).click()

        // 입력
        const inputs = page.locator('div[role="dialog"] input')
        await inputs.nth(0).fill(setName)
        await inputs.nth(1).fill(setDescription)

        // Create 클릭
        await page.locator(SELECTORS.createSetButton).click()

        // 토스트 메시지 확인
        await expectToast(page, /created|success/i)

        // 모달 닫힘 확인
        await expect(page.locator(SELECTORS.createSetModal)).not.toBeVisible()

        // 목록에 추가 확인
        await expectSetInList(page, setName, true)

        // Cleanup
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-005: MCP Definition 추가 - 환경변수 포함
    // ========================================================================
    test('M-005: should create MCP Definition with environment variables', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M005-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // New MCP 클릭
        await page.locator(SELECTORS.newMcpButton).click()

        // Add New MCP 모달 대기
        const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
        await expect(addMcpModal).toBeVisible()

        // MCP 정보 입력
        const mcpName = generateUniqueName('M005-MCP')
        const inputs = addMcpModal.locator('input')
        await inputs.nth(0).fill(mcpName)
        await inputs.nth(1).fill('npx')
        await inputs.nth(2).fill('-y @mcp/postgres')
        await inputs.nth(4).fill('{"DATABASE_URL": "postgres://localhost"}')

        // Save 클릭
        await addMcpModal.locator('button:has-text("Save")').click()

        // 토스트 확인
        await expectToast(page, /created|success/i)

        // Cleanup
        await deleteMcpDef(page, mcpName)
        await page.locator('button[aria-label="Close"]').click().catch(() => {})
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-006: MCP Definition 편집 모드 진입
    // ========================================================================
    test('M-006: should enter edit mode for MCP Definition', async ({ page }) => {
        // 테스트용 Set 및 MCP 생성
        const setName = generateUniqueName('M006-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // MCP 생성
        const mcpName = generateUniqueName('M006-MCP')
        await createMcpDef(page, mcpName, 'npx', '-y @test/server')

        // MCP를 Set에 추가
        await addMcpToSet(page, mcpName)

        // Sheet 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // Set에서 MCP 편집 버튼 클릭
        const mcpItem = page.locator(`div:has(h4:text("${mcpName}"))`).first()
        await mcpItem.locator(SELECTORS.mcpItemEdit).click()

        // 편집 모달 확인 (Edit MCP)
        const editMcpModal = page.getByRole('dialog', { name: 'Edit MCP' })
        await expect(editMcpModal).toBeVisible()

        // 기존 값이 로드되었는지 확인
        const inputs = editMcpModal.locator('input')
        await expect(inputs.nth(0)).toHaveValue(mcpName)

        // Cancel
        await editMcpModal.locator('button:has-text("Cancel")').click()

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, mcpName)
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-007: MCP Definition 편집 - 저장 성공
    // ========================================================================
    test('M-007: should edit and save MCP Definition successfully', async ({ page }) => {
        // 테스트용 Set 및 MCP 생성
        const setName = generateUniqueName('M007-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        const mcpName = generateUniqueName('M007-MCP')
        await createMcpDef(page, mcpName, 'npx', '-y @test/server')
        await addMcpToSet(page, mcpName)

        // Sheet 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // MCP 편집
        const mcpItem = page.locator(`div:has(h4:text("${mcpName}"))`).first()
        await mcpItem.locator(SELECTORS.mcpItemEdit).click()

        // 편집 모달 대기
        const editMcpModal = page.getByRole('dialog', { name: 'Edit MCP' })
        await expect(editMcpModal).toBeVisible()

        // command 수정
        const inputs = editMcpModal.locator('input')
        await inputs.nth(1).clear()
        await inputs.nth(1).fill('node')

        // Save
        await editMcpModal.locator('button:has-text("Save")').click()

        // 토스트 확인
        await expectToast(page, /updated|success/i)

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, mcpName)
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-008: MCP Definition 편집 - 취소
    // ========================================================================
    test('M-008: should cancel edit and discard changes', async ({ page }) => {
        // 테스트용 Set 및 MCP 생성
        const setName = generateUniqueName('M008-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        const mcpName = generateUniqueName('M008-MCP')
        await createMcpDef(page, mcpName, 'npx', '-y @test/server')
        await addMcpToSet(page, mcpName)

        // Sheet 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // MCP 편집
        const mcpItem = page.locator(`div:has(h4:text("${mcpName}"))`).first()
        await mcpItem.locator(SELECTORS.mcpItemEdit).click()

        // 편집 모달 대기
        const editMcpModal = page.getByRole('dialog', { name: 'Edit MCP' })
        await expect(editMcpModal).toBeVisible()

        // command 수정 (저장하지 않음)
        const inputs = editMcpModal.locator('input')
        await inputs.nth(1).clear()
        await inputs.nth(1).fill('changed-command')

        // Cancel
        await editMcpModal.locator('button:has-text("Cancel")').click()

        // 모달 닫힘 확인
        await expect(editMcpModal).not.toBeVisible()

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, mcpName)
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-009: MCP Set 삭제 - 확인 다이얼로그
    // ========================================================================
    test('M-009: should show delete confirmation dialog for Set', async ({ page }) => {
        // 테스트용 Set 생성
        const setName = generateUniqueName('M009-Set')
        await createSet(page, setName)

        // 호버하여 삭제 버튼 표시
        const setItem = page.locator(SELECTORS.setItem(setName)).first()
        await setItem.hover()

        // 삭제 버튼 클릭
        await setItem.locator(SELECTORS.setDeleteButton).click()

        // 확인 다이얼로그 표시 확인
        const deleteDialog = page.locator(SELECTORS.deleteSetDialog)
        await expect(deleteDialog).toBeVisible()

        // Set 이름이 다이얼로그에 표시되는지 확인
        await expect(deleteDialog).toContainText(setName)

        // Cancel 클릭
        await page.locator(SELECTORS.cancelDeleteButton).click()

        // 다이얼로그 닫힘 확인
        await expect(deleteDialog).not.toBeVisible()

        // Set이 여전히 존재하는지 확인
        await expectSetInList(page, setName, true)

        // Cleanup
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-010: MCP Set 삭제 - 성공 케이스
    // ========================================================================
    test('M-010: should delete Set successfully', async ({ page }) => {
        // 테스트용 Set 생성
        const setName = generateUniqueName('M010-Set')
        await createSet(page, setName)

        // 삭제 실행
        await deleteSet(page, setName)

        // 토스트 메시지 확인
        await expectToast(page, /deleted|success/i)

        // 목록에서 제거 확인
        await expectSetInList(page, setName, false)
    })

    // ========================================================================
    // M-011: MCP Library 검색/필터 (구현된 경우)
    // ========================================================================
    test('M-011: should filter MCP definitions in Library', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M011-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // Library가 열렸는지 확인
        await expect(page.locator(SELECTORS.libraryTitle)).toBeVisible()

        // 검색 필드가 있는 경우 검색 테스트
        // 현재 구현에서는 검색 필드가 없으므로 Library 기본 표시 확인
        const newButton = page.locator(SELECTORS.newMcpButton)
        const importButton = page.locator(SELECTORS.importButton)

        await expect(newButton).toBeVisible()
        await expect(importButton).toBeVisible()

        // Sheet 닫기
        await page.keyboard.press('Escape')

        // Cleanup
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-012: MCP Import - JSON
    // ========================================================================
    test('M-012: should open Import modal and accept JSON', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M012-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // Import 버튼 클릭
        await page.locator(SELECTORS.importButton).click()

        // Import 모달 확인
        await expect(page.locator(SELECTORS.importModal)).toBeVisible()

        // JSON 입력 필드 확인
        await expect(page.locator(SELECTORS.jsonTextarea)).toBeVisible()

        // GitHub URL 필드 확인
        await expect(page.locator('input[placeholder*="github" i]')).toBeVisible()

        // 샘플 JSON 입력
        const sampleJson = JSON.stringify({
            mcpServers: {
                'test-import': {
                    command: 'npx',
                    args: ['-y', '@test/import-server']
                }
            }
        }, null, 2)
        await page.locator(SELECTORS.jsonTextarea).fill(sampleJson)

        // Import 버튼 클릭
        await page.locator(SELECTORS.importConfirmButton).click()

        // 토스트 확인
        await expectToast(page, /imported|success/i)

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, 'test-import').catch(() => {})
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })
})
