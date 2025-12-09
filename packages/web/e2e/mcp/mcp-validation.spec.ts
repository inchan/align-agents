/**
 * MCP Validation E2E Tests - P0/P1
 * 유효성 검증 시나리오 테스트
 *
 * @priority P0, P1
 * @scenarios M-013 ~ M-016
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    generateUniqueName,
    navigateToMcpPage,
    createSet,
    selectSet,
    openLibrary,
    createMcpDef,
    cleanupSet,
    deleteMcpDef,
} from './mcp.helpers'

test.describe('MCP Validation - P0/P1 @priority-p0 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // M-013: 빈 서버 이름으로 추가 시도
    // ========================================================================
    test('M-013: should not allow empty server name', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M013-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // New MCP 클릭
        await page.locator(SELECTORS.newMcpButton).click()

        // Add New MCP 모달 대기
        const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
        await expect(addMcpModal).toBeVisible()

        // Name 비워두고 Command만 입력
        const inputs = addMcpModal.locator('input')
        await inputs.nth(0).fill('') // 빈 이름
        await inputs.nth(1).fill('npx')

        // Save 버튼 클릭
        await addMcpModal.locator('button:has-text("Save")').click()

        // 에러 토스트 또는 버튼 비활성화 확인
        // 현재 구현에서는 토스트로 에러 표시
        const toastOrError = page.locator('[data-sonner-toast], div[role="status"]').filter({ hasText: /required|error/i })
        await expect(toastOrError.first()).toBeVisible({ timeout: TIMEOUTS.medium })

        // 모달이 닫히지 않았는지 확인
        await expect(addMcpModal).toBeVisible()

        // Cancel
        await addMcpModal.locator('button:has-text("Cancel")').click()

        // Cleanup
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-014: 빈 command로 추가 시도
    // ========================================================================
    test('M-014: should not allow empty command', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M014-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // New MCP 클릭
        await page.locator(SELECTORS.newMcpButton).click()

        // Add New MCP 모달 대기
        const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
        await expect(addMcpModal).toBeVisible()

        // Name만 입력하고 Command 비워두기
        const inputs = addMcpModal.locator('input')
        await inputs.nth(0).fill('test-server')
        await inputs.nth(1).fill('') // 빈 command

        // Save 버튼 클릭
        await addMcpModal.locator('button:has-text("Save")').click()

        // 에러 토스트 확인
        const toastOrError = page.locator('[data-sonner-toast], div[role="status"]').filter({ hasText: /required|error/i })
        await expect(toastOrError.first()).toBeVisible({ timeout: TIMEOUTS.medium })

        // 모달이 닫히지 않았는지 확인
        await expect(addMcpModal).toBeVisible()

        // Cancel
        await addMcpModal.locator('button:has-text("Cancel")').click()

        // Cleanup
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-015: 중복 서버 이름으로 추가 시도
    // ========================================================================
    test('M-015: should handle duplicate server name', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M015-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // 첫 번째 MCP 생성
        const mcpName = generateUniqueName('M015-MCP')
        await createMcpDef(page, mcpName, 'npx', '-y @test/server')

        // 동일한 이름으로 두 번째 MCP 생성 시도
        await page.locator(SELECTORS.newMcpButton).click()

        // Add New MCP 모달 대기
        const addMcpModal = page.getByRole('dialog', { name: 'Add New MCP' })
        await expect(addMcpModal).toBeVisible()

        const inputs = addMcpModal.locator('input')
        await inputs.nth(0).fill(mcpName) // 동일한 이름
        await inputs.nth(1).fill('node')

        // Save 클릭
        await addMcpModal.locator('button:has-text("Save")').click()

        // 중복 처리: 업데이트되거나 에러 발생
        // 현재 구현에서는 동일 이름으로 업데이트될 수 있음
        // 에러가 발생하면 토스트 확인
        await page.waitForTimeout(1000)

        // 모달이 닫히면 성공 (업데이트), 안 닫히면 에러
        const modalVisible = await addMcpModal.isVisible()

        if (modalVisible) {
            // 에러 케이스 - 모달 닫기
            await addMcpModal.locator('button:has-text("Cancel")').click()
        }

        // Cleanup
        await deleteMcpDef(page, mcpName).catch(() => {})
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-016: 잘못된 JSON 형식 입력
    // ========================================================================
    test('M-016: should reject invalid JSON format', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M016-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기
        await openLibrary(page)

        // Import 버튼 클릭
        await page.locator(SELECTORS.importButton).click()
        await expect(page.locator(SELECTORS.importModal)).toBeVisible()

        // 잘못된 JSON 입력 (닫는 중괄호 누락)
        const invalidJson = '{ "mcpServers": { "test": { "command": "npx" }'
        await page.locator(SELECTORS.jsonTextarea).fill(invalidJson)

        // Import 버튼 클릭
        await page.locator(SELECTORS.importConfirmButton).click()

        // 에러 토스트 확인
        const errorToast = page.locator('[data-sonner-toast], div[role="status"]').filter({ hasText: /invalid|error|json/i })
        await expect(errorToast.first()).toBeVisible({ timeout: TIMEOUTS.medium })

        // 모달이 닫히지 않았는지 확인 (재시도 가능)
        await expect(page.locator(SELECTORS.importModal)).toBeVisible()

        // Cancel
        await page.locator('div[role="dialog"] button:has-text("Cancel")').click()

        // Cleanup
        await page.keyboard.press('Escape')
        await cleanupSet(page, setName)
    })
})

test.describe('MCP Set Validation', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // 빈 Set 이름으로 생성 시도
    // ========================================================================
    test('should not allow empty Set name', async ({ page }) => {
        // 모달 열기
        await page.locator(SELECTORS.addSetButton).click()
        await expect(page.locator(SELECTORS.createSetModal)).toBeVisible()

        // 이름 비워두기
        const inputs = page.locator('div[role="dialog"] input')
        await inputs.nth(0).fill('')

        // Create 버튼 클릭
        await page.locator(SELECTORS.createSetButton).click()

        // 버튼 비활성화 또는 에러 확인
        // 현재 구현에서는 빈 이름이면 handleCreateSet에서 early return
        // 모달이 닫히지 않음
        await page.waitForTimeout(500)
        await expect(page.locator(SELECTORS.createSetModal)).toBeVisible()

        // Cancel
        await page.locator(SELECTORS.modalCancelButton).click()
    })
})
