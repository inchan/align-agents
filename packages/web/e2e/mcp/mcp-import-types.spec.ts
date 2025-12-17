/**
 * MCP Import/Export & HTTP/SSE Type E2E Tests - P1
 * Import/Export 기능 및 HTTP/SSE 타입 지원 테스트
 *
 * @priority P1
 * @scenarios M-025, M-026, M-030, M-031, M-032, M-033
 *
 * M-027 (Export) 은 RB-51 완료 후 별도 테스트 추가 예정
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
    createHttpMcpDef,
    openImportModal,
    importJson,
    expectMcpDefInLibrary,
    expectToast,
    cleanupSet,
    deleteMcpDef,
    closeLibrary,
} from './mcp.helpers'

test.describe('MCP Import/Export & HTTP/SSE Types - P1 @priority-p1', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToMcpPage(page)
    })

    // ========================================================================
    // M-025: JSON 파일 Import
    // ========================================================================
    test('M-025: should import MCP definitions from JSON', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M025-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Import 모달 열기
        await openImportModal(page)

        // 샘플 JSON (stdio 타입)
        const importedServerName = `imported-server-${Date.now()}`
        const sampleJson = JSON.stringify({
            mcpServers: {
                [importedServerName]: {
                    command: 'npx',
                    args: ['-y', '@mcp/imported-server'],
                    description: 'Imported via E2E test'
                }
            }
        }, null, 2)

        // JSON 입력 및 Import
        await importJson(page, sampleJson)

        // Library에서 Import된 서버 확인
        await expectMcpDefInLibrary(page, importedServerName, true)

        // Cleanup
        await deleteMcpDef(page, importedServerName)
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-026: Import 시 중복 서버 처리
    // ========================================================================
    test('M-026: should handle duplicate server on import', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M026-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // 먼저 MCP 생성
        const existingServerName = generateUniqueName('existing-server')
        await createMcpDef(page, existingServerName, 'node', 'original-server.js')

        // Library 닫기
        await closeLibrary(page)

        // Import 모달 열기
        await openImportModal(page)

        // 동일한 이름으로 Import 시도 (다른 command/args)
        const duplicateJson = JSON.stringify({
            mcpServers: {
                [existingServerName]: {
                    command: 'npx',
                    args: ['-y', '@mcp/updated-server'],
                    description: 'Updated via import'
                }
            }
        }, null, 2)

        // JSON 입력
        await page.locator(SELECTORS.jsonTextarea).fill(duplicateJson)

        // Import 버튼 클릭
        await page.locator(SELECTORS.importConfirmButton).click()

        // 토스트 확인 (성공 또는 업데이트 메시지)
        await expectToast(page, /imported|updated|success/i)

        // Library에서 서버가 여전히 존재하는지 확인
        await expectMcpDefInLibrary(page, existingServerName, true)

        // Cleanup
        await deleteMcpDef(page, existingServerName)
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-030: HTTP 타입 MCP 서버 추가
    // ========================================================================
    test('M-030: should create HTTP type MCP server', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M030-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // HTTP 타입 MCP 생성
        const httpServerName = generateUniqueName('http-server')
        const httpUrl = 'http://localhost:3000/mcp'
        await createHttpMcpDef(page, httpServerName, 'http', httpUrl)

        // 토스트 확인
        await expectToast(page, /created|success/i)

        // Library에서 생성된 서버 확인
        await expectMcpDefInLibrary(page, httpServerName, true)

        // Cleanup
        await deleteMcpDef(page, httpServerName)
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-031: SSE 타입 MCP 서버 추가
    // ========================================================================
    test('M-031: should create SSE type MCP server', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M031-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // SSE 타입 MCP 생성
        const sseServerName = generateUniqueName('sse-server')
        const sseUrl = 'http://localhost:3001/sse'
        await createHttpMcpDef(page, sseServerName, 'sse', sseUrl)

        // 토스트 확인
        await expectToast(page, /created|success/i)

        // Library에서 생성된 서버 확인
        await expectMcpDefInLibrary(page, sseServerName, true)

        // Cleanup
        await deleteMcpDef(page, sseServerName)
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-032: 타입별 필수 필드 유효성 검증
    // ========================================================================
    test('M-032: should validate required fields by type', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M032-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기 및 New 버튼 클릭
        await openLibrary(page)
        await page.locator(SELECTORS.newMcpButton).click()

        // Add MCP Definition 모달 대기
        const modal = page.getByRole('dialog', { name: 'Add MCP Definition' })
        await expect(modal).toBeVisible({ timeout: TIMEOUTS.short })

        // 1. stdio 타입 - Command 필드가 보이고, URL 필드는 숨겨져야 함
        // (기본 선택 상태)
        await expect(modal.locator('input[placeholder*="npx"]')).toBeVisible()
        await expect(modal.locator('input[placeholder*="http"]')).toBeHidden()

        // 2. http 타입으로 변경 - URL 필드가 보이고, Command 필드는 숨겨져야 함
        await modal.locator('button:has-text("http")').click()
        await expect(modal.locator('input[placeholder*="http"]')).toBeVisible()
        await expect(modal.locator('input[placeholder*="npx"]')).toBeHidden()

        // 3. sse 타입으로 변경 - URL 필드가 보여야 함
        await modal.locator('button:has-text("sse")').click()
        await expect(modal.locator('input[placeholder*="http"]')).toBeVisible()
        await expect(modal.locator('input[placeholder*="npx"]')).toBeHidden()

        // 4. 다시 stdio로 변경 - Command 필드가 보여야 함
        await modal.locator('button:has-text("stdio")').click()
        await expect(modal.locator('input[placeholder*="npx"]')).toBeVisible()
        await expect(modal.locator('input[placeholder*="http"]')).toBeHidden()

        // Cancel 클릭
        await modal.locator('button:has-text("Cancel")').click()

        // Cleanup
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // M-033: 타입 변경 시 필드 전환 확인
    // ========================================================================
    test('M-033: should clear fields when switching types', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M033-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Library 열기 및 New 버튼 클릭
        await openLibrary(page)
        await page.locator(SELECTORS.newMcpButton).click()

        // Add MCP Definition 모달 대기
        const modal = page.getByRole('dialog', { name: 'Add MCP Definition' })
        await expect(modal).toBeVisible({ timeout: TIMEOUTS.short })

        // 1. stdio 타입에서 Command 입력
        const commandInput = modal.locator('input[placeholder*="npx"]')
        await commandInput.fill('test-command')
        await expect(commandInput).toHaveValue('test-command')

        // 2. http 타입으로 변경 - Command 값이 초기화되고 URL 필드가 나타남
        await modal.locator('button:has-text("http")').click()
        const urlInput = modal.locator('input[placeholder*="http"]')
        await expect(urlInput).toBeVisible()
        await expect(urlInput).toHaveValue('')

        // 3. URL 입력
        await urlInput.fill('http://test-url.com/mcp')
        await expect(urlInput).toHaveValue('http://test-url.com/mcp')

        // 4. 다시 stdio로 변경 - URL 값이 초기화되고 Command 필드가 나타남
        await modal.locator('button:has-text("stdio")').click()
        const commandInputAgain = modal.locator('input[placeholder*="npx"]')
        await expect(commandInputAgain).toBeVisible()
        await expect(commandInputAgain).toHaveValue('')

        // Cancel 클릭
        await modal.locator('button:has-text("Cancel")').click()

        // Cleanup
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    // ========================================================================
    // 추가 테스트: HTTP/SSE 타입 Import
    // ========================================================================
    test('M-025-http: should import HTTP type MCP from JSON', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M025H-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Import 모달 열기
        await openImportModal(page)

        // HTTP 타입 JSON
        const httpServerName = `http-import-${Date.now()}`
        const httpJson = JSON.stringify({
            mcpServers: {
                [httpServerName]: {
                    type: 'http',
                    url: 'http://localhost:8080/mcp'
                }
            }
        }, null, 2)

        // JSON 입력 및 Import
        await importJson(page, httpJson)

        // Library에서 Import된 서버 확인
        await expectMcpDefInLibrary(page, httpServerName, true)

        // Cleanup
        await deleteMcpDef(page, httpServerName)
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })

    test('M-025-sse: should import SSE type MCP from JSON', async ({ page }) => {
        // 테스트용 Set 생성 및 선택
        const setName = generateUniqueName('M025S-Set')
        await createSet(page, setName)
        await selectSet(page, setName)

        // Import 모달 열기
        await openImportModal(page)

        // SSE 타입 JSON
        const sseServerName = `sse-import-${Date.now()}`
        const sseJson = JSON.stringify({
            mcpServers: {
                [sseServerName]: {
                    type: 'sse',
                    url: 'http://localhost:9090/events'
                }
            }
        }, null, 2)

        // JSON 입력 및 Import
        await importJson(page, sseJson)

        // Library에서 Import된 서버 확인
        await expectMcpDefInLibrary(page, sseServerName, true)

        // Cleanup
        await deleteMcpDef(page, sseServerName)
        await closeLibrary(page)
        await cleanupSet(page, setName)
    })
})
