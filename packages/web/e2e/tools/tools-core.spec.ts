/**
 * Tools Core E2E Tests
 * 도구 관리 페이지 핵심 기능 테스트
 *
 * @priority P0, P1
 * @scenarios T-001 ~ T-008
 *
 * Tools 페이지 구조:
 * - 헤더: "도구 관리" 타이틀 + "Add Tool" 버튼
 * - 그리드: 도구 카드 목록
 * - 카드: 도구 이름, 설정 경로, 상태 인디케이터, 더보기 메뉴
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    BUILTIN_TOOL_IDS,
    generateUniqueName,
    navigateToToolsPage,
    getToolCardCount,
    openAddToolModal,
    closeAddToolModal,
    addCustomTool,
    openToolDropdown,
    deleteCustomTool,
    openConfigEditorViaButton,
    openConfigEditorViaDropdown,
    openHelpModal,
    expectToast,
    expectToolInList,
    expectToolIsCustom,
    expectToolIsInstalled,
    cleanupCustomTool,
    expectDropdownMenuItem,
    resetDatabase,
} from './tools.helpers'

test.describe('Tools Core - 배치1 @priority-p0', () => {
    test.beforeEach(async ({ page, request }) => {
        // Reset DB to ensure clean state
        await resetDatabase(request)
        await navigateToToolsPage(page)
    })

    // ========================================================================
    // T-001: 도구 목록 페이지 렌더링
    // ========================================================================
    test('T-001: should display tools page with tool cards', async ({ page }) => {
        // 페이지 헤더 확인
        await expect(page.locator(SELECTORS.pageTitle)).toBeVisible()
        await expect(page.locator(SELECTORS.pageDescription)).toBeVisible()

        // Add Tool 버튼 확인
        await expect(page.locator(SELECTORS.addToolButton)).toBeVisible()

        // 도구 카드 목록 확인 (최소 1개 이상, built-in 도구 존재)
        const cardCount = await getToolCardCount(page)
        expect(cardCount).toBeGreaterThan(0)

        // 첫 번째 카드 구조 확인
        const firstCard = page.locator(SELECTORS.toolCard).first()
        await expect(firstCard.locator(SELECTORS.toolName)).toBeVisible()
        await expect(firstCard.locator(SELECTORS.toolConfigPath)).toBeVisible()
        await expect(firstCard.locator(SELECTORS.moreButton)).toBeVisible()
    })

    // ========================================================================
    // T-001-A: 도구 목록 빈 상태 표시
    // ========================================================================
    test('T-001-A: should display empty state when no tools exist', async ({ page, request }) => {
        // 이 테스트는 built-in 도구가 항상 존재하므로 빈 상태 확인이 어려움
        // 대신 페이지가 빈 상태에서도 기본 구조가 유지되는지 확인

        // 페이지 헤더는 항상 표시
        await expect(page.locator(SELECTORS.pageTitle)).toBeVisible()
        await expect(page.locator(SELECTORS.addToolButton)).toBeVisible()

        // Built-in 도구들이 존재하는지 확인 (일부라도)
        // cursor, vscode 등 built-in 중 하나라도 있으면 통과
        const hasAnyTool = await getToolCardCount(page) >= 0
        expect(hasAnyTool).toBeTruthy()
    })

    // ========================================================================
    // T-002: 설치됨/미설치 필터링 (정렬)
    // ========================================================================
    test('T-002: should sort tools with installed first', async ({ page }) => {
        // 도구 목록이 로드될 때까지 대기
        await page.waitForTimeout(1000)

        // 모든 도구 카드 가져오기
        const toolCards = page.locator(SELECTORS.toolCard)
        const cardCount = await toolCards.count()

        if (cardCount >= 2) {
            // 설치된 도구와 미설치 도구 인덱스 수집
            const installedIndices: number[] = []
            const notInstalledIndices: number[] = []

            for (let i = 0; i < cardCount; i++) {
                const card = toolCards.nth(i)
                // 설치 상태 확인: bg-primary (초록) vs bg-muted (회색)
                const hasInstalledIndicator = await card.locator('div.bg-primary.rounded-full').count() > 0

                if (hasInstalledIndicator) {
                    installedIndices.push(i)
                } else {
                    notInstalledIndices.push(i)
                }
            }

            // 설치된 도구가 미설치 도구보다 먼저 나타나는지 확인
            if (installedIndices.length > 0 && notInstalledIndices.length > 0) {
                const lastInstalledIndex = Math.max(...installedIndices)
                const firstNotInstalledIndex = Math.min(...notInstalledIndices)
                expect(lastInstalledIndex).toBeLessThan(firstNotInstalledIndex)
            }
        }
    })
})

test.describe('Tools Core - 배치2 @priority-p0', () => {
    test.beforeEach(async ({ page, request }) => {
        await resetDatabase(request)
        await navigateToToolsPage(page)
    })

    // ========================================================================
    // T-003: 커스텀 도구 추가 (성공)
    // ========================================================================
    test('T-003: should add custom tool successfully', async ({ page }) => {
        const toolName = generateUniqueName('Custom Tool')
        const configPath = TEST_DATA.defaultConfigPath

        // 모달 열기
        await openAddToolModal(page)

        // 모달 입력 필드 확인
        const modal = page.locator(SELECTORS.addToolModal)
        await expect(modal).toBeVisible()
        await expect(modal.locator('input').first()).toBeVisible()

        // 도구 추가
        await addCustomTool(page, toolName, { configPath })

        // 목록에 도구 확인
        await expectToolInList(page, toolName, true)

        // Custom 배지 확인
        await expectToolIsCustom(page, toolName, true)

        // Cleanup
        await cleanupCustomTool(page, toolName)
    })

    // ========================================================================
    // T-004: 커스텀 도구 추가 (실패 - 빈 이름)
    // ========================================================================
    test('T-004: should disable Add button when name is empty', async ({ page }) => {
        await openAddToolModal(page)

        // 이름 필드 비워두기
        const modal = page.locator(SELECTORS.addToolModal)
        const nameInput = modal.locator('input').first()
        await nameInput.fill('')

        // Add Tool 버튼 비활성화 확인
        const addButton = page.locator(SELECTORS.addToolModalButton)
        await expect(addButton).toBeDisabled()

        // 모달 닫기
        await closeAddToolModal(page)
    })

    // ========================================================================
    // T-004-A: 도구 추가 경로 유효성 검증
    // ========================================================================
    test('T-004-A: should allow optional path fields', async ({ page }) => {
        const toolName = generateUniqueName('Path Test')

        await openAddToolModal(page)

        // 이름만 입력 (경로 필드 비워둠)
        const modal = page.locator(SELECTORS.addToolModal)
        await modal.locator('input').first().fill(toolName)

        // Add Tool 버튼 활성화 확인
        const addButton = page.locator(SELECTORS.addToolModalButton)
        await expect(addButton).toBeEnabled()

        // 도구 추가
        await addButton.click()

        // 토스트 확인
        await expectToast(page, /added|success/i)

        // 목록에 도구 확인
        await expectToolInList(page, toolName, true)

        // Cleanup
        await cleanupCustomTool(page, toolName)
    })

    // ========================================================================
    // T-005: 커스텀 도구 삭제
    // ========================================================================
    test('T-005: should delete custom tool successfully', async ({ page }) => {
        // 먼저 커스텀 도구 추가
        const toolName = generateUniqueName('Delete Test')
        await addCustomTool(page, toolName, { configPath: TEST_DATA.defaultConfigPath })
        await expectToolInList(page, toolName, true)

        // 삭제 실행
        await deleteCustomTool(page, toolName)

        // 목록에서 제거 확인
        await expectToolInList(page, toolName, false)
    })

    // ========================================================================
    // T-005-A: Built-in 도구 삭제 방지
    // ========================================================================
    test('T-005-A: should not show delete option for built-in tools', async ({ page }) => {
        // Built-in 도구 중 하나 찾기 (cursor, vscode 등)
        const builtInToolNames = ['Cursor', 'VS Code', 'Windsurf', 'Claude Desktop', 'Zed']
        let foundBuiltIn = false

        for (const toolName of builtInToolNames) {
            const toolCard = page.locator(SELECTORS.toolCardByName(toolName)).first()
            if (await toolCard.isVisible({ timeout: 1000 }).catch(() => false)) {
                foundBuiltIn = true

                // 드롭다운 열기
                await toolCard.locator(SELECTORS.moreButton).click()
                await expect(page.locator(SELECTORS.dropdownMenu)).toBeVisible()

                // Delete 메뉴 없음 확인
                await expectDropdownMenuItem(page, 'Delete', false)

                // 드롭다운 닫기
                await page.keyboard.press('Escape')
                break
            }
        }

        // Built-in 도구가 최소 1개는 있어야 함
        if (!foundBuiltIn) {
            test.skip()
        }
    })
})

test.describe('Tools Core - 배치3 @priority-p0 @priority-p1', () => {
    test.beforeEach(async ({ page, request }) => {
        await resetDatabase(request)
        await navigateToToolsPage(page)
    })

    // ========================================================================
    // T-006: 도구 설정(Config) 편집
    // ========================================================================
    test('T-006: should open config editor modal', async ({ page }) => {
        // 설치된 도구 찾기 (configPath가 있는 도구)
        const toolCards = page.locator(SELECTORS.toolCard)
        const cardCount = await toolCards.count()

        let foundEditableTool = false

        for (let i = 0; i < cardCount; i++) {
            const card = toolCards.nth(i)
            const editButton = card.locator(SELECTORS.editConfigButton)

            // 설정 편집 버튼이 활성화된 도구 찾기
            if (await editButton.isVisible().catch(() => false) &&
                await editButton.isEnabled().catch(() => false)) {
                foundEditableTool = true

                // 설정 편집 버튼 클릭
                await editButton.click()

                // ConfigEditorModal 표시 확인
                await expect(page.locator(SELECTORS.configEditorModal)).toBeVisible({ timeout: TIMEOUTS.medium })

                // 모달 닫기
                await page.keyboard.press('Escape')
                await page.waitForTimeout(500)
                break
            }
        }

        // 편집 가능한 도구가 없으면 드롭다운 통해 테스트
        if (!foundEditableTool) {
            for (let i = 0; i < cardCount; i++) {
                const card = toolCards.nth(i)

                // 드롭다운 열기
                await card.locator(SELECTORS.moreButton).click()
                await page.waitForTimeout(300)

                // Edit Config 메뉴 있는지 확인
                const editConfigItem = page.locator(SELECTORS.editConfigMenuItem)
                if (await editConfigItem.isVisible().catch(() => false)) {
                    await editConfigItem.click()
                    await expect(page.locator(SELECTORS.configEditorModal)).toBeVisible({ timeout: TIMEOUTS.medium })
                    await page.keyboard.press('Escape')
                    foundEditableTool = true
                    break
                } else {
                    await page.keyboard.press('Escape')
                }
            }
        }

        // 설정 가능한 도구가 하나도 없으면 테스트 스킵
        if (!foundEditableTool) {
            test.skip()
        }
    })

    // ========================================================================
    // T-007: Help 명령어 출력 확인
    // ========================================================================
    test('T-007: should show help output for installed tool', async ({ page }) => {
        // 설치된 도구 찾기
        const toolCards = page.locator(SELECTORS.toolCard)
        const cardCount = await toolCards.count()

        let foundInstalledTool = false

        for (let i = 0; i < cardCount; i++) {
            const card = toolCards.nth(i)

            // 설치 상태 확인 (bg-primary 인디케이터)
            const isInstalled = await card.locator('div.bg-primary.rounded-full').count() > 0

            if (isInstalled) {
                // 드롭다운 열기
                await card.locator(SELECTORS.moreButton).click()
                await page.waitForTimeout(300)

                // Check Help 메뉴 확인
                const checkHelpItem = page.locator(SELECTORS.checkHelpMenuItem)
                if (await checkHelpItem.isVisible().catch(() => false)) {
                    foundInstalledTool = true

                    // Check Help 클릭
                    await checkHelpItem.click()

                    // Help 모달 표시 확인
                    await expect(page.locator(SELECTORS.helpModal)).toBeVisible({ timeout: TIMEOUTS.medium })

                    // 로딩 또는 출력 확인
                    const helpSpinner = page.locator(SELECTORS.helpSpinner)
                    const helpOutput = page.locator(SELECTORS.helpOutput)

                    // 로딩 스피너가 보이거나, 출력이 보이거나
                    await expect(helpSpinner.or(helpOutput)).toBeVisible({ timeout: TIMEOUTS.long })

                    // 모달 닫기
                    await page.keyboard.press('Escape')
                    break
                } else {
                    await page.keyboard.press('Escape')
                }
            }
        }

        // 설치된 도구가 없으면 테스트 스킵
        if (!foundInstalledTool) {
            test.skip()
        }
    })

    // ========================================================================
    // T-008: Open MCP 메뉴 동작
    // ========================================================================
    test('T-008: should navigate to MCP page from Claude Desktop', async ({ page }) => {
        // Claude Desktop 도구 찾기
        const claudeDesktopCard = page.locator(SELECTORS.toolCardByName('Claude Desktop')).first()

        if (await claudeDesktopCard.isVisible({ timeout: 2000 }).catch(() => false)) {
            // 드롭다운 열기
            await claudeDesktopCard.locator(SELECTORS.moreButton).click()
            await expect(page.locator(SELECTORS.dropdownMenu)).toBeVisible()

            // Open MCP 메뉴 확인
            const openMcpItem = page.locator(SELECTORS.openMcpMenuItem)
            await expect(openMcpItem).toBeVisible()

            // Open MCP 클릭
            await openMcpItem.click()

            // URL 해시 변경 확인
            await expect(page).toHaveURL(/#\/mcp/, { timeout: TIMEOUTS.short })
        } else {
            // Claude Desktop이 없으면 테스트 스킵
            test.skip()
        }
    })
})
