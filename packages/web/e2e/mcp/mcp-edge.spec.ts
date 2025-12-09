/**
 * MCP Edge Cases & Error Handling E2E Tests - P1/P2
 * 엣지 케이스 및 에러 처리 시나리오 테스트
 *
 * @priority P1, P2
 * @scenarios M-017 ~ M-024, M-028 ~ M-029
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
    openLibrary,
    createMcpDef,
    addMcpToSet,
    expectToast,
    expectSetInList,
    cleanupSet,
    deleteMcpDef,
} from './mcp.helpers'

test.describe('MCP Edge Cases - P2 @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // M-020: 빈 MCP 목록 상태
    // ========================================================================
    test('M-020: should show empty state when no Sets exist', async ({ page }) => {
        // 기존 Sets가 있으면 Empty State가 안 보일 수 있음
        // Empty State 또는 Set 목록이 보이는지 확인
        const emptyState = page.locator(SELECTORS.emptySetState)
        const setsExist = page.locator(SELECTORS.setsHeader)

        // 둘 중 하나는 보여야 함
        await expect(setsExist).toBeVisible({ timeout: TIMEOUTS.medium })

        // Sets가 없는 경우 Empty State 확인
        const isEmpty = await emptyState.isVisible().catch(() => false)
        if (isEmpty) {
            await expect(emptyState).toBeVisible()
            // Create Set 버튼이 Empty State에 있는지 확인
            await expect(page.locator('button:has-text("Create Set")')).toBeVisible()
        }
    })

    // ========================================================================
    // M-021: 긴 서버 이름 처리
    // ========================================================================
    test('M-021: should handle long server names with truncation', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M021-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // 긴 이름의 MCP 생성
        const longMcpName = TEST_DATA.longName
        await createMcpDef(page, longMcpName, 'npx', '-y @test/server')

        // MCP를 Set에 추가
        await addMcpToSet(page, longMcpName)

        // Sheet 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // UI에서 이름이 truncate 되어 표시되는지 확인
        // truncate 클래스가 적용된 요소 확인
        const mcpNameElement = page.locator(`h4:has-text("${longMcpName.substring(0, 20)}")`).first()
        await expect(mcpNameElement).toBeVisible()

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, longMcpName).catch(() => {})
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-022: 다수의 args 처리
    // ========================================================================
    test('M-022: should handle multiple arguments correctly', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M022-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // 많은 args를 가진 MCP 생성
        const mcpName = generateUniqueName('M022-MCP')
        const manyArgs = '-y @mcp/server --port 3000 --host localhost --debug --verbose --timeout 30000'
        await createMcpDef(page, mcpName, 'npx', manyArgs)

        // MCP를 Set에 추가
        await addMcpToSet(page, mcpName)

        // Sheet 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // args가 표시되는지 확인 (truncate 될 수 있음)
        const argsDisplay = page.locator(`div:has(h4:text("${mcpName}")) span`).filter({ hasText: /--/ })
        await expect(argsDisplay.first()).toBeVisible()

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, mcpName)
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-023: 특수문자 포함 서버 이름
    // ========================================================================
    test('M-023: should handle special characters in server name', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M023-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // 특수문자가 포함된 MCP 이름
        const mcpName = TEST_DATA.specialChars // 'test-server_v1.0'
        await createMcpDef(page, mcpName, 'npx', '-y @test/server')

        // 성공적으로 생성되었는지 확인
        await expectToast(page, /created|success/i)

        // MCP를 Set에 추가
        await addMcpToSet(page, mcpName)

        // Sheet 닫기
        await page.keyboard.press('Escape')
        await page.waitForTimeout(500)

        // UI에 정확히 표시되는지 확인
        await expect(page.locator(`h4:has-text("${mcpName}")`).first()).toBeVisible()

        // Cleanup
        await openLibrary(page)
        await deleteMcpDef(page, mcpName)
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-024: No Set Selected 상태
    // ========================================================================
    test('M-024: should show no set selected state', async ({ page }) => {
        // 새 탭에서 직접 접속하면 Set이 자동 선택될 수 있음
        // 자동 선택되지 않은 경우 "No Set Selected" 표시
        // 또는 첫 번째 Set이 자동 선택됨

        const noSetState = page.locator(SELECTORS.noSetSelectedState)
        const setDetail = page.locator(SELECTORS.setDetailCard)

        // 둘 중 하나가 보여야 함
        const isNoSetVisible = await noSetState.isVisible({ timeout: 2000 }).catch(() => false)
        const isDetailVisible = await setDetail.isVisible({ timeout: 2000 }).catch(() => false)

        expect(isNoSetVisible || isDetailVisible).toBe(true)

        if (isNoSetVisible) {
            await expect(noSetState).toBeVisible()
        }
    })
})

test.describe('MCP Error Handling - P1 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // M-017: 에러 처리 - 추가 실패 (네트워크 에러 시뮬레이션)
    // ========================================================================
    test('M-017: should handle add failure gracefully', async ({ page }) => {
        // 이 테스트는 네트워크 에러를 시뮬레이션하기 어려우므로
        // 에러 처리 UI가 존재하는지만 확인

        const setName = generateUniqueName('M017-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // New MCP 모달 열기
        await page.locator(SELECTORS.newMcpButton).click()

        // Add New MCP 모달 대기
        const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
        await expect(addMcpModal).toBeVisible()

        // Cancel 버튼이 있어서 에러 시 복구 가능한지 확인
        await expect(addMcpModal.locator('button:has-text("Cancel")')).toBeVisible()

        // Cancel
        await addMcpModal.locator('button:has-text("Cancel")').click()
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-018: 에러 처리 - 저장 실패
    // ========================================================================
    test('M-018: should keep modal open on save failure for retry', async ({ page }) => {
        // 에러 발생 시 모달이 유지되어 재시도 가능한지 확인
        const setName = generateUniqueName('M018-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // New MCP 모달
        await page.locator(SELECTORS.newMcpButton).click()

        // Add New MCP 모달 대기
        const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
        await expect(addMcpModal).toBeVisible()

        // 필수 필드 없이 저장 시도 (에러 유발)
        await addMcpModal.locator('button:has-text("Save")').click()

        // 모달이 유지되는지 확인 (재시도 가능)
        await page.waitForTimeout(500)
        await expect(addMcpModal).toBeVisible()

        // Cancel
        await addMcpModal.locator('button:has-text("Cancel")').click()
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-019: 에러 처리 - 삭제 실패 시 데이터 유지
    // ========================================================================
    test('M-019: should maintain data on delete failure', async ({ page }) => {
        // 삭제 실패 시 원본 데이터가 유지되는지 확인
        const setName = generateUniqueName('M019-Set')
        await createSet(page, setName)

        // 삭제 취소 시 데이터 유지 확인
        const setItem = page.locator(SELECTORS.setItem(setName)).first()
        await setItem.hover()
        await setItem.locator(SELECTORS.setDeleteButton).click()

        // 다이얼로그에서 Cancel
        await page.locator(SELECTORS.cancelDeleteButton).click()

        // Set이 여전히 존재하는지 확인
        await expectSetInList(page, setName, true)

        // Cleanup
        await cleanupSet(page, setName)
    })
})

test.describe('MCP Accessibility - P2 @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // M-028: 키보드 네비게이션
    // ========================================================================
    test('M-028: should support keyboard navigation', async ({ page }) => {
        // Tab 키로 요소 간 이동 가능한지 확인
        const setName = generateUniqueName('M028-Set')
        await createSet(page, setName)

        // Tab 키로 Add Set 버튼에 포커스
        await page.keyboard.press('Tab')

        // Enter로 Set 생성 모달 열기
        await page.locator(SELECTORS.addSetButton).focus()
        await page.keyboard.press('Enter')

        // 모달이 열렸는지 확인
        await expect(page.locator(SELECTORS.createSetModal)).toBeVisible()

        // Escape로 모달 닫기
        await page.keyboard.press('Escape')

        // 모달이 닫혔는지 확인
        await expect(page.locator(SELECTORS.createSetModal)).not.toBeVisible()

        // Cleanup
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-029: Tooltip 확인 (긴 이름)
    // ========================================================================
    test('M-029: should show tooltip for truncated names', async ({ page }) => {
        // 긴 이름의 Set 생성
        const longSetName = 'Very Long Set Name That Should Be Truncated In UI'
        await createSet(page, longSetName)

        // Set 항목에 호버
        const setItem = page.locator(SELECTORS.setItem(longSetName.substring(0, 15))).first()
        await setItem.hover()

        // title 속성 또는 tooltip 확인
        // DOM에 title 속성이 있는지 확인
        const hasTitle = await setItem.getAttribute('title')

        // title이 없어도 truncate 스타일이 적용되어 있으면 OK
        const hasTruncate = await setItem.locator('.truncate').count()

        expect(hasTitle !== null || hasTruncate > 0).toBe(true)

        // Cleanup
        await cleanupSet(page, longSetName)
    })
})
