/**
 * Logs Core E2E Tests
 * SSE 실시간 로그 시나리오 테스트
 *
 * @scenarios L-001 ~ L-011
 *
 * LogsPage 기능:
 * - 히스토리 로드
 * - SSE 실시간 스트림
 * - 연결 상태 표시
 * - 자동 재연결
 * - 로그 필터링/검색
 * - 일시정지/재개
 * - 내보내기
 * - 로그 제한 (1000개)
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    navigateToLogsPage,
    mockHistoryAPI,
    mockSSEStream,
    mockSSEConnectionFailure,
    mockSSEConnectionRecovery,
    expectConnectionStatus,
    expectConnectionIndicatorColor,
    expectLogCount,
    expectLogMessage,
    selectLogLevel,
    searchLogs,
    togglePause,
    expectPaused,
    clearLogs,
    exportLogs,
    expectHistoryError,
    expectParseErrorCount,
    clickRetry,
    generateBulkLogs,
    formatSSEEvent,
} from './logs.helpers'

test.describe('Logs Core - SSE Scenarios', () => {
    // ========================================================================
    // L-001: 로그 히스토리 초기 로드
    // ========================================================================
    test('L-001: should load log history on initial page load', async ({ page }) => {
        // History API Mock - 초기 로그 데이터
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        // 페이지 접속
        await navigateToLogsPage(page)

        // 로그 목록 표시 확인
        await expectLogCount(page, TEST_DATA.sampleLogs.length)

        // 각 로그 메시지 확인
        for (const log of TEST_DATA.sampleLogs) {
            await expectLogMessage(page, log.message)
        }

        // 카테고리 표시 확인
        await expect(page.locator('text=[server]')).toBeVisible()
        await expect(page.locator('text=[system]')).toBeVisible()
    })

    // ========================================================================
    // L-002: SSE 실시간 로그 수신
    // NOTE: Playwright의 SSE Mock 제한으로, 초기 로그로 테스트
    // ========================================================================
    test('L-002: should receive logs via SSE stream in real-time', async ({ page }) => {
        // 빈 히스토리로 시작
        await mockHistoryAPI(page, { logs: [] })

        // SSE 스트림에서 초기 로그 제공 (실시간 시뮬레이션)
        const initialLogs = [
            {
                id: 'realtime-1',
                timestamp: new Date().toISOString(),
                level: 'info',
                message: 'Real-time log message received',
                category: 'sse-test'
            },
            {
                id: 'realtime-2',
                timestamp: new Date().toISOString(),
                level: 'warn',
                message: 'Second real-time log',
                category: 'sse-test'
            }
        ]

        await mockSSEStream(page, { logs: initialLogs })

        await navigateToLogsPage(page)

        // 연결 상태 확인
        await expectConnectionStatus(page, 'connected')

        // SSE를 통해 수신된 로그 확인
        await expectLogMessage(page, 'Real-time log message received')
        await expectLogMessage(page, 'Second real-time log')
        await expectLogCount(page, 2)
    })

    // ========================================================================
    // L-003: 연결 상태 표시
    // ========================================================================
    test('L-003: should display connection status indicator', async ({ page }) => {
        await mockHistoryAPI(page, { logs: [] })

        // 연결 성공 시나리오
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 연결됨 상태 확인
        await expectConnectionStatus(page, 'connected')
        await expectConnectionIndicatorColor(page, 'green')

        // 연결 상태 텍스트 확인
        await expect(page.locator(SELECTORS.connectionStatus)).toContainText('connected', { ignoreCase: true })
    })

    // ========================================================================
    // L-004: 연결 끊김 시 자동 재연결
    // SKIP: Playwright route.fulfill()은 SSE 스트리밍을 제대로 지원하지 않음
    // 실제 SSE 서버와의 통합 테스트가 필요함
    // ========================================================================
    test.skip('L-004: should auto-reconnect when connection is lost', async ({ page }) => {
        await mockHistoryAPI(page, { logs: [] })

        // 첫 연결은 실패하도록 설정
        await mockSSEConnectionFailure(page)

        await navigateToLogsPage(page)

        // 연결 실패 후 error 상태 확인
        await expectConnectionStatus(page, 'error')
        await expectConnectionIndicatorColor(page, 'red')

        // Retry 버튼 표시 확인
        await expect(page.locator(SELECTORS.retryButton)).toBeVisible({ timeout: TIMEOUTS.long })

        // 연결 복구 Mock
        await mockSSEConnectionRecovery(page, [])

        // Retry 버튼 클릭
        await clickRetry(page)

        // 연결 복구 확인
        await expectConnectionStatus(page, 'connected')
        await expectConnectionIndicatorColor(page, 'green')
    })

    // ========================================================================
    // L-005: 로그 일시정지 및 재개
    // ========================================================================
    test('L-005: should pause and resume log auto-scroll', async ({ page }) => {
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 초기 상태: Live
        await expectPaused(page, false)

        // Pause 버튼 클릭
        await togglePause(page)

        // Paused 상태 확인
        await expectPaused(page, true)

        // Play 버튼으로 변경 확인
        await expect(page.locator('button:has(svg.lucide-play)')).toBeVisible()

        // 다시 Play 클릭
        await togglePause(page)

        // Live 상태 복원
        await expectPaused(page, false)
    })

    // ========================================================================
    // L-006: 로그 필터링
    // ========================================================================
    test('L-006: should filter logs by level and search text', async ({ page }) => {
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 전체 로그 수 확인
        await expectLogCount(page, TEST_DATA.sampleLogs.length)

        // 레벨별 필터 테스트: error만 선택
        await selectLogLevel(page, 'error')

        // error 로그만 표시되어야 함
        await expectLogMessage(page, 'Connection failed') // error 레벨
        await expect(page.locator(SELECTORS.logContainer).locator('text=Server started')).not.toBeVisible() // info 레벨

        // all로 복원
        await selectLogLevel(page, 'all')

        // 검색 필터 테스트
        await searchLogs(page, 'memory')

        // memory 포함 로그만 표시
        await expectLogMessage(page, 'High memory usage')
        await expect(page.locator(SELECTORS.logContainer).locator('text=Server started')).not.toBeVisible()

        // 검색어 삭제
        await searchLogs(page, '')

        // 모든 로그 복원
        await expectLogCount(page, TEST_DATA.sampleLogs.length)
    })

    // ========================================================================
    // L-007: 로그 초기화
    // ========================================================================
    test('L-007: should clear all logs', async ({ page }) => {
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 로그 존재 확인
        await expectLogCount(page, TEST_DATA.sampleLogs.length)

        // Clear 버튼 클릭
        await clearLogs(page)

        // 로그 삭제 확인
        await expectLogCount(page, 0)

        // Empty state 메시지 확인
        await expect(page.locator(SELECTORS.emptyState)).toBeVisible()
    })

    // ========================================================================
    // L-008: 로그 내보내기
    // ========================================================================
    test('L-008: should export logs as JSON and CSV', async ({ page }) => {
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // Export 버튼 확인
        await expect(page.locator(SELECTORS.exportButton)).toBeVisible()

        // === JSON Export 테스트 ===
        await page.locator(SELECTORS.exportButton).click()
        await expect(page.locator(SELECTORS.exportJsonOption)).toBeVisible()
        await expect(page.locator(SELECTORS.exportCsvOption)).toBeVisible()

        const jsonDownloadPromise = page.waitForEvent('download')
        await page.locator(SELECTORS.exportJsonOption).click()
        const jsonDownload = await jsonDownloadPromise
        expect(jsonDownload.suggestedFilename()).toContain('.json')

        // === CSV Export 테스트 ===
        await page.locator(SELECTORS.exportButton).click()
        const csvDownloadPromise = page.waitForEvent('download')
        await page.locator(SELECTORS.exportCsvOption).click()
        const csvDownload = await csvDownloadPromise
        expect(csvDownload.suggestedFilename()).toContain('.csv')
    })

    // ========================================================================
    // L-009: 히스토리 로드 실패 처리
    // ========================================================================
    test('L-009: should display error when history load fails', async ({ page }) => {
        // History API 실패 Mock
        await mockHistoryAPI(page, { shouldFail: true, status: 500 })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 에러 메시지 표시 확인
        await expectHistoryError(page, true)

        // "Failed to load log history" 메시지 확인
        await expect(page.locator('text=Failed to load log history')).toBeVisible({ timeout: TIMEOUTS.medium })
    })

    // ========================================================================
    // L-010: 로그 파싱 에러 카운트
    // SKIP: Playwright route.fulfill()은 SSE 스트리밍을 제대로 지원하지 않음
    // 잘못된 JSON을 순차적으로 전송하는 것이 불가능
    // ========================================================================
    test.skip('L-010: should count and display parse errors', async ({ page }) => {
        await mockHistoryAPI(page, { logs: [] })

        // SSE 스트림에서 잘못된 JSON을 포함하여 전송
        // NOTE: 문자열 기반 응답으로는 파싱 에러를 유발하기 어려움
        const sseBody = [
            formatSSEEvent({ id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Valid log' }),
            'data: {invalid json}\n\n',
            'data: not json at all\n\n'
        ].join('')

        await page.route('**/api/logs/stream', async (route) => {
            await route.fulfill({
                status: 200,
                headers: {
                    'Content-Type': 'text/event-stream',
                    'Cache-Control': 'no-cache',
                },
                body: sseBody,
            })
        })

        await navigateToLogsPage(page)

        // 파싱 에러 카운트 표시 확인 (2개 에러)
        await expectParseErrorCount(page, 2)
    })

    // ========================================================================
    // L-011: 1000개 로그 제한 동작 확인
    // History + SSE 합산으로 1000개 제한 테스트
    // ========================================================================
    test('L-011: should limit logs to 1000 entries', async ({ page }) => {
        // 히스토리에서 995개, SSE에서 10개 = 총 1005개 시도
        // 결과적으로 1000개만 유지되어야 함
        const historyLogs = generateBulkLogs(995)
        const sseLogs = generateBulkLogs(10).map((log, i) => ({
            ...log,
            id: `sse-${i}`,
            message: `SSE log ${i + 1}`
        }))

        await mockHistoryAPI(page, { logs: historyLogs })
        await mockSSEStream(page, { logs: sseLogs })

        await navigateToLogsPage(page)

        // 최대 1000개 확인
        await expectLogCount(page, 1000)

        // 최신 SSE 로그가 표시되는지 확인
        await expectLogMessage(page, 'SSE log 10')
    })
})

// ========================================================================
// 추가 Edge Case 테스트
// ========================================================================
test.describe('Logs Edge Cases', () => {
    test('should show empty state when no logs exist', async ({ page }) => {
        await mockHistoryAPI(page, { logs: [] })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // Empty state 메시지 확인
        await expect(page.locator(SELECTORS.emptyState)).toBeVisible()
        await expectLogCount(page, 0)
    })

    test('should show no match state when filter returns empty', async ({ page }) => {
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 존재하지 않는 텍스트로 검색
        await searchLogs(page, 'nonexistent-text-xyz')

        // No match 메시지 확인
        await expect(page.locator(SELECTORS.noMatchState)).toBeVisible()
    })

    test('should disable export button when no logs exist', async ({ page }) => {
        await mockHistoryAPI(page, { logs: [] })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // Export 버튼이 비활성화되어 있는지 확인
        await expect(page.locator(SELECTORS.exportButton)).toBeDisabled()
    })

    test('should filter by category', async ({ page }) => {
        await mockHistoryAPI(page, { logs: TEST_DATA.sampleLogs })
        await mockSSEStream(page, { logs: [] })

        await navigateToLogsPage(page)

        // 카테고리 드롭다운이 존재하면 테스트
        const categoryDropdown = page.locator('button:has-text("All Categories")')
        if (await categoryDropdown.isVisible({ timeout: 1000 })) {
            await categoryDropdown.click()

            // server 카테고리 선택
            await page.locator('[role="menuitem"]:has-text("server")').click()

            // server 카테고리 로그만 표시
            await expectLogMessage(page, 'Server started')
            await expect(page.locator(SELECTORS.logContainer).locator('text=High memory usage')).not.toBeVisible()
        }
    })
})
