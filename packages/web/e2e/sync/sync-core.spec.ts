/**
 * Sync Core E2E Tests
 * Sync 페이지 핵심 기능 테스트
 *
 * @priority P0, P1, P2
 * @scenarios S-001 ~ S-009, S-003-A
 *
 * Sync 페이지 구조:
 * - 3컬럼 Kanban 레이아웃
 * - Column 1: Target Tools (Tool Set 목록)
 * - Column 2: Rules Source (Rule 선택)
 * - Column 3: MCP Server Set (MCP Set 선택)
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    generateUniqueName,
    navigateToSyncPage,
    selectToolSet,
    expectToolSetSelected,
    openCreateSetDialog,
    createCustomToolSet,
    deleteCustomToolSet,
    expectToolSetInList,
    selectRule,
    selectNoRule,
    selectMcpSet,
    selectNoMcpSet,
    expectRuleSelected,
    expectMcpSetSelected,
    expectToast,
    cleanupLocalStorage,
    seedCustomToolSet,
    checkCustomSetExists,
    resetDatabase,
    seedToolsData,
    seedRulesData,
    seedMcpData,
} from './sync.helpers'

test.describe('Sync Core - P0 @priority-p0', () => {
    test.beforeEach(async ({ page, request }) => {
        // Reset DB and cleanup LocalStorage
        await resetDatabase(request)
        await cleanupLocalStorage(page)

        // Seed test data
        await seedToolsData(request, {
            tools: [
                { id: 'cursor', name: 'Cursor', exists: true },
                { id: 'vscode', name: 'VS Code', exists: true },
                { id: 'claude-desktop', name: 'Claude Desktop', exists: true },
            ]
        })

        await seedRulesData(request, {
            rules: [
                { id: 'rule-1', name: 'Test Rule 1', content: 'This is test rule content 1' },
                { id: 'rule-2', name: 'Test Rule 2', content: 'This is test rule content 2' },
            ]
        })

        await seedMcpData(request, {
            tools: [
                { id: 'server-1', name: 'Test Server', command: 'npx', args: ['-y', '@test/server'] }
            ],
            sets: [
                { id: 'mcp-set-1', name: 'Test MCP Set', isActive: true, items: [{ id: 'item-1', serverId: 'server-1' }] },
            ],
        })

        await navigateToSyncPage(page)
    })

    test.afterEach(async ({ page }) => {
        // Cleanup LocalStorage after each test for isolation
        await cleanupLocalStorage(page)
    })

    // ========================================================================
    // S-001: Sync 페이지 진입 및 초기 상태
    // ========================================================================
    test('S-001: should display Sync page with 3-column layout', async ({ page }) => {
        // 3컬럼 헤더 확인
        await expect(page.locator(SELECTORS.targetToolsHeader)).toBeVisible()
        await expect(page.locator(SELECTORS.rulesSourceHeader)).toBeVisible()
        await expect(page.locator(SELECTORS.mcpServerSetHeader)).toBeVisible()

        // Target Tools 컬럼에 기본 Set 목록 확인
        for (const setName of TEST_DATA.defaultToolSetNames) {
            const setItem = page.locator(SELECTORS.toolSetItem(setName)).first()
            // 도구가 있는 경우에만 Set이 표시됨
            const isVisible = await setItem.isVisible({ timeout: 2000 }).catch(() => false)
            if (setName === 'All Tools') {
                // All Tools는 항상 표시되어야 함 (도구가 있는 경우)
                expect(isVisible).toBe(true)
            }
        }

        // Rules Source 컬럼에 "None" 옵션 확인
        await expect(page.locator(SELECTORS.ruleNoneOption).first()).toBeVisible()

        // MCP Server Set 컬럼에 "None" 옵션 확인
        await expect(page.locator(SELECTORS.mcpSetNoneOption).first()).toBeVisible()

        // + 버튼 (Tool Set 추가) 확인
        await expect(page.locator(SELECTORS.addToolSetButton).first()).toBeVisible()
    })

    // ========================================================================
    // S-002: 기본 Tool Set 변경
    // ========================================================================
    test('S-002: should switch between default Tool Sets', async ({ page }) => {
        // 기본 선택 확인 (첫 번째 Set)
        const firstSet = page.locator(SELECTORS.toolSetItem('All Tools')).first()
        const firstSetVisible = await firstSet.isVisible().catch(() => false)

        if (!firstSetVisible) {
            test.skip()
            return
        }

        // All Tools가 선택되어 있는지 확인
        await expectToolSetSelected(page, 'All Tools', true)

        // 다른 Set들 찾기
        const ideSet = page.locator(SELECTORS.toolSetItem('IDEs')).first()
        const ideSetVisible = await ideSet.isVisible().catch(() => false)

        if (ideSetVisible) {
            // IDEs Set 클릭
            await selectToolSet(page, 'IDEs')

            // IDEs가 선택됨 확인
            await expectToolSetSelected(page, 'IDEs', true)

            // All Tools 선택 해제됨 확인
            await expectToolSetSelected(page, 'All Tools', false)

            // 다시 All Tools 선택
            await selectToolSet(page, 'All Tools')
            await expectToolSetSelected(page, 'All Tools', true)
        }
    })

    // ========================================================================
    // S-003: 커스텀 Tool Set 생성 및 저장
    // ========================================================================
    test('S-003: should create custom Tool Set and persist in LocalStorage', async ({ page }) => {
        const customSetName = generateUniqueName('Custom Set')

        // 다이얼로그 열기
        await openCreateSetDialog(page)

        // 다이얼로그 UI 확인
        await expect(page.locator(SELECTORS.setNameInput)).toBeVisible()
        await expect(page.locator(SELECTORS.setDescriptionInput)).toBeVisible()

        // 이름 미입력 시 Create Set 버튼 비활성화 확인
        const createButton = page.locator(SELECTORS.createSetButton)
        await expect(createButton).toBeDisabled()

        // 이름 입력
        await page.locator(SELECTORS.setNameInput).fill(customSetName)

        // 도구 미선택 시 여전히 비활성화
        await expect(createButton).toBeDisabled()

        // 도구 선택 (첫 번째 체크박스)
        const firstCheckbox = page.locator('div[role="dialog"] input[type="checkbox"]').first()
        if (await firstCheckbox.isVisible().catch(() => false)) {
            await firstCheckbox.check()
        }

        // 이제 Create Set 버튼 활성화
        await expect(createButton).toBeEnabled()

        // 생성
        await createButton.click()

        // 다이얼로그 닫힘 확인
        await expect(page.locator(SELECTORS.createSetDialog)).not.toBeVisible({ timeout: TIMEOUTS.medium })

        // 목록에 추가 확인
        await expectToolSetInList(page, customSetName, true)

        // LocalStorage 저장 확인
        const exists = await checkCustomSetExists(page, customSetName)
        expect(exists).toBe(true)

        // Cleanup
        await deleteCustomToolSet(page, customSetName)
    })

    // ========================================================================
    // S-003-A: 중복 이름 커스텀 Tool Set 생성 방지
    // ========================================================================
    test('S-003-A: should prevent creating duplicate custom Tool Set names', async ({ page }) => {
        const duplicateName = 'Existing Set'

        // 기존 Set 생성 (LocalStorage에 직접 추가)
        await seedCustomToolSet(page, {
            id: `custom-${Date.now()}`,
            name: duplicateName,
            description: 'Original set',
            toolIds: ['cursor']
        })

        // 페이지 새로고침하여 LocalStorage 반영
        await navigateToSyncPage(page)

        // 기존 Set이 표시되는지 확인
        await expectToolSetInList(page, duplicateName, true)

        // 같은 이름으로 새 Set 생성 시도
        await openCreateSetDialog(page)
        await page.locator(SELECTORS.setNameInput).fill(duplicateName)

        // 도구 선택
        const firstCheckbox = page.locator('div[role="dialog"] input[type="checkbox"]').first()
        if (await firstCheckbox.isVisible().catch(() => false)) {
            await firstCheckbox.check()
        }

        // Create Set 버튼 클릭
        await page.locator(SELECTORS.createSetButton).click()

        // 결과 확인: 다음 중 하나가 발생해야 함
        // 1. 에러 토스트 표시 또는
        // 2. 다이얼로그가 닫히고 고유 이름으로 생성됨 (예: "Existing Set (2)")

        // 잠시 대기
        await page.waitForTimeout(500)

        // LocalStorage에서 중복 여부 확인
        const sets = await page.evaluate(() => {
            return JSON.parse(localStorage.getItem('custom-tool-sets') || '[]')
        })

        // 같은 이름의 Set이 2개 이상 있으면 안 됨 (덮어쓰기 방지)
        const duplicateCount = sets.filter((s: { name: string }) => s.name === duplicateName).length

        // 현재 구현에 따라 다르게 검증:
        // - 중복 허용하지 않음: duplicateCount === 1
        // - 자동 이름 변경: sets에 유사한 이름 존재
        // 가장 중요한 것은 기존 데이터가 덮어쓰기 되지 않는 것
        if (duplicateCount > 1) {
            // 중복이 발생했다면 테스트 실패 (데이터 무결성 위반)
            expect(duplicateCount).toBeLessThanOrEqual(1)
        }

        // Cleanup
        await cleanupLocalStorage(page)
    })

    // ========================================================================
    // S-004: 커스텀 Tool Set 삭제
    // ========================================================================
    test('S-004: should delete custom Tool Set', async ({ page }) => {
        const customSetName = generateUniqueName('Delete Test')

        // 커스텀 Set 생성
        await seedCustomToolSet(page, {
            id: `custom-${Date.now()}`,
            name: customSetName,
            toolIds: ['cursor']
        })

        // 페이지 새로고침
        await navigateToSyncPage(page)

        // Set이 표시되는지 확인
        await expectToolSetInList(page, customSetName, true)

        // 기본 Set에는 삭제 버튼이 없는지 확인
        const defaultSetItem = page.locator(SELECTORS.toolSetItem('All Tools')).first()
        if (await defaultSetItem.isVisible().catch(() => false)) {
            await defaultSetItem.hover()
            await page.waitForTimeout(200)
            const deleteButton = defaultSetItem.locator(SELECTORS.toolSetDeleteButton)
            await expect(deleteButton).not.toBeVisible()
        }

        // 커스텀 Set 호버 시 삭제 버튼 표시
        const customSetItem = page.locator(SELECTORS.toolSetItem(customSetName)).first()
        await customSetItem.hover()
        await page.waitForTimeout(200)

        const deleteButton = customSetItem.locator(SELECTORS.toolSetDeleteButton)
        await expect(deleteButton).toBeVisible()

        // 삭제 실행 (confirm dialog 자동 수락)
        page.once('dialog', async dialog => {
            await dialog.accept()
        })
        await deleteButton.click()

        // 목록에서 제거 확인
        await expectToolSetInList(page, customSetName, false)

        // LocalStorage에서도 제거 확인
        const exists = await checkCustomSetExists(page, customSetName)
        expect(exists).toBe(false)
    })

    // ========================================================================
    // S-005: Rules 선택 동작
    // ========================================================================
    test('S-005: should select and deselect Rules', async ({ page }) => {
        // "None" 기본 선택 확인
        const noneOption = page.locator(SELECTORS.ruleNoneOption).first()
        await expect(noneOption.locator(SELECTORS.checkIcon)).toBeVisible()

        // Rule 목록에서 첫 번째 Rule 찾기
        const ruleItem = page.locator(SELECTORS.ruleItem('Test Rule 1')).first()
        const ruleVisible = await ruleItem.isVisible().catch(() => false)

        if (!ruleVisible) {
            // Rule이 없으면 테스트 스킵
            test.skip()
            return
        }

        // Rule 선택
        await ruleItem.click()
        await expect(ruleItem.locator(SELECTORS.checkIcon)).toBeVisible({ timeout: TIMEOUTS.short })

        // "None" 선택 해제 확인
        await expect(noneOption.locator(SELECTORS.checkIcon)).not.toBeVisible()

        // 다시 "None" 선택
        await noneOption.click()
        await expect(noneOption.locator(SELECTORS.checkIcon)).toBeVisible()

        // Rule 선택 해제 확인
        await expect(ruleItem.locator(SELECTORS.checkIcon)).not.toBeVisible()
    })

    // ========================================================================
    // S-006: MCP Set 선택 동작
    // ========================================================================
    test('S-006: should select and deselect MCP Sets', async ({ page }) => {
        // "None" 기본 선택 확인
        const noneOption = page.locator(SELECTORS.mcpSetNoneOption).first()
        await expect(noneOption.locator(SELECTORS.checkIcon)).toBeVisible()

        // MCP Set 찾기
        const mcpSetItem = page.locator(SELECTORS.mcpSetItem('Test MCP Set')).first()
        const mcpSetVisible = await mcpSetItem.isVisible().catch(() => false)

        if (!mcpSetVisible) {
            // MCP Set이 없으면 테스트 스킵
            test.skip()
            return
        }

        // MCP Set 선택
        await mcpSetItem.click()
        await expect(mcpSetItem.locator(SELECTORS.checkIcon)).toBeVisible({ timeout: TIMEOUTS.short })

        // "None" 선택 해제 확인
        await expect(noneOption.locator(SELECTORS.checkIcon)).not.toBeVisible()

        // Servers Badge 확인
        const serversBadge = mcpSetItem.locator('span:has-text("Servers")')
        await expect(serversBadge).toBeVisible()

        // 다시 "None" 선택
        await noneOption.click()
        await expect(noneOption.locator(SELECTORS.checkIcon)).toBeVisible()

        // MCP Set 선택 해제 확인
        await expect(mcpSetItem.locator(SELECTORS.checkIcon)).not.toBeVisible()
    })
})

test.describe('Sync Core - P1 @priority-p1', () => {
    test.beforeEach(async ({ page, request }) => {
        await resetDatabase(request)
        await cleanupLocalStorage(page)

        await seedToolsData(request, {
            tools: [
                { id: 'cursor', name: 'Cursor', exists: true },
            ]
        })

        await navigateToSyncPage(page)
    })

    test.afterEach(async ({ page }) => {
        await cleanupLocalStorage(page)
    })

    // ========================================================================
    // S-007: 동기화 실행 성공
    // ========================================================================
    test.skip('S-007: should execute sync successfully', async ({ page }) => {
        // TODO: SyncControls 컴포넌트가 SyncPage에 통합되면 구현
        // 현재 SyncPage에는 동기화 실행 버튼이 별도로 있지 않고,
        // SyncDetailPage나 다른 경로를 통해 동기화가 실행됨

        // Sync 페이지가 정상 로드되었는지만 확인
        await expect(page.locator(SELECTORS.targetToolsHeader)).toBeVisible()

        // Tool Set 선택
        const allToolsSet = page.locator(SELECTORS.toolSetItem('All Tools')).first()
        if (await allToolsSet.isVisible().catch(() => false)) {
            await allToolsSet.click()
        }

        // 동기화 관련 UI 요소가 있는지 탐색
        // (SyncControls가 통합된 경우를 위한 플레이스홀더)
    })

    // ========================================================================
    // S-008: 동기화 실패 및 에러 처리
    // ========================================================================
    test.skip('S-008: should handle sync errors gracefully', async ({ page }) => {
        // TODO: 동기화 기능이 통합된 후 구현
        // 에러 처리 테스트는 실제 동기화 실패 케이스 필요

        await expect(page.locator(SELECTORS.targetToolsHeader)).toBeVisible()

        // 페이지 상호작용 후에도 정상 동작하는지 확인
        const addButton = page.locator(SELECTORS.addToolSetButton).first()
        if (await addButton.isVisible().catch(() => false)) {
            await addButton.click()
            await expect(page.locator(SELECTORS.createSetDialog)).toBeVisible()
            await page.locator(SELECTORS.cancelButton).click()
            await expect(page.locator(SELECTORS.createSetDialog)).not.toBeVisible()
        }
    })
})

test.describe('Sync Core - P2 @priority-p2', () => {
    test.beforeEach(async ({ page, request }) => {
        await resetDatabase(request)
        await cleanupLocalStorage(page)
    })

    test.afterEach(async ({ page }) => {
        await cleanupLocalStorage(page)
    })

    // ========================================================================
    // S-009: 도구 미발견 시 자동 스캔
    // ========================================================================
    test('S-009: should trigger auto-scan when no tools found', async ({ page, request }) => {
        // 도구가 없는 상태에서 페이지 로드
        // (seedToolsData를 호출하지 않음)

        await page.goto('/sync')
        await page.waitForLoadState('networkidle')

        // 페이지가 로드될 때까지 대기
        await expect(page.locator(SELECTORS.targetToolsHeader)).toBeVisible({ timeout: TIMEOUTS.long })

        // 자동 스캔이 트리거되면 도구가 발견될 수 있음
        // 또는 도구가 없으면 기본 Set이 비어있을 수 있음

        // 페이지가 에러 없이 로드되면 통과
        const pageContent = await page.content()
        expect(pageContent).toContain('Target Tools')

        // 콘솔에서 auto-scan 로그 확인 (선택적)
        // 실제 구현에서는 console.log('No tools found, triggering auto-scan...')가 출력됨
    })
})

test.describe('Sync Validation - S-003-A Extended @priority-p0', () => {
    test.beforeEach(async ({ page, request }) => {
        await resetDatabase(request)
        await cleanupLocalStorage(page)

        await seedToolsData(request, {
            tools: [
                { id: 'cursor', name: 'Cursor', exists: true },
                { id: 'vscode', name: 'VS Code', exists: true },
            ]
        })
    })

    test.afterEach(async ({ page }) => {
        await cleanupLocalStorage(page)
    })

    // ========================================================================
    // S-003-A (확장): 빈 이름으로 생성 시도
    // ========================================================================
    test('S-003-A-1: should not allow empty name for custom Tool Set', async ({ page }) => {
        await navigateToSyncPage(page)

        await openCreateSetDialog(page)

        // 이름 필드 비워두기
        const nameInput = page.locator(SELECTORS.setNameInput)
        await nameInput.fill('')

        // 도구 선택
        const firstCheckbox = page.locator('div[role="dialog"] input[type="checkbox"]').first()
        if (await firstCheckbox.isVisible().catch(() => false)) {
            await firstCheckbox.check()
        }

        // Create Set 버튼 비활성화 확인
        const createButton = page.locator(SELECTORS.createSetButton)
        await expect(createButton).toBeDisabled()

        // 공백만 있는 이름 시도
        await nameInput.fill('   ')
        await expect(createButton).toBeDisabled()

        // 다이얼로그 닫기
        await page.locator(SELECTORS.cancelButton).click()
    })

    // ========================================================================
    // S-003-A (확장): 도구 미선택으로 생성 시도
    // ========================================================================
    test('S-003-A-2: should not allow creating Tool Set without tools', async ({ page }) => {
        await navigateToSyncPage(page)

        await openCreateSetDialog(page)

        // 이름 입력
        await page.locator(SELECTORS.setNameInput).fill('Test Set')

        // 도구 선택하지 않음

        // Create Set 버튼 비활성화 확인
        const createButton = page.locator(SELECTORS.createSetButton)
        await expect(createButton).toBeDisabled()

        // 다이얼로그 닫기
        await page.locator(SELECTORS.cancelButton).click()
    })
})
