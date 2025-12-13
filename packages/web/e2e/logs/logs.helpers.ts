/**
 * Logs E2E 테스트 헬퍼
 * SSE Mock 유틸리티, 공통 셀렉터, 타임아웃 정의
 *
 * LogsPage 구조:
 * - 헤더: 연결 상태, 에러 표시, Retry 버튼
 * - LogViewer: 로그 목록, 필터, 검색, 내보내기
 */
import { Page, expect, Route } from '@playwright/test'

// ============================================================================
// 상수 정의
// ============================================================================

/**
 * 셀렉터 정의
 * LogsPage.tsx, LogViewer.tsx 구조 기반
 */
export const SELECTORS = {
    // 페이지 헤더
    pageTitle: 'h1:has-text("Logs")',
    connectionIndicator: 'span.rounded-full',
    connectionStatus: 'span.capitalize',
    retryButton: 'button:has-text("Retry Connection")',
    historyError: 'span.text-destructive',
    parseErrorCount: 'span.text-yellow-500',

    // LogViewer 툴바
    searchInput: 'input[placeholder="Search logs..."]',
    filterSection: 'div.flex.items-center.gap-1.border-l',
    levelDropdown: 'button:has(svg.lucide-chevron-down)',
    categoryDropdown: 'button:has-text("All Categories")',
    pauseButton: 'button:has(svg.lucide-pause)',
    playButton: 'button:has(svg.lucide-play)',
    clearButton: 'button:has(svg.lucide-trash-2)',
    exportButton: 'button:has-text("Export")',

    // 로그 목록
    logContainer: 'div.overflow-y-auto.font-mono',
    logEntry: 'div.flex.gap-2',
    emptyState: 'text=No logs yet',
    noMatchState: 'text=No logs match your filters',

    // 상태 바
    statusBar: 'div.bg-muted\\/50',
    totalCount: 'span:has-text("Total:")',
    liveIndicator: 'span:has-text("Live")',
    pausedIndicator: 'span:has-text("Paused")',

    // Export 메뉴
    exportJsonOption: 'text=Export as JSON',
    exportCsvOption: 'text=Export as CSV',
} as const

/**
 * 타임아웃 설정
 */
export const TIMEOUTS = {
    short: 3000,   // 빠른 UI 반응
    medium: 5000,  // 일반적인 API 응답
    long: 10000,   // 느린 네트워크, SSE 연결
    sseReconnect: 15000, // SSE 재연결 대기
} as const

/**
 * 로그 엔트리 타입 (테스트용)
 */
export type TestLogEntry = {
    id: string;
    timestamp: string;
    level: string;
    message: string;
    category?: string;
}

/**
 * 테스트 데이터
 */
export const TEST_DATA = {
    sampleLogs: [
        { id: '1', timestamp: new Date().toISOString(), level: 'info', message: 'Server started', category: 'server' },
        { id: '2', timestamp: new Date().toISOString(), level: 'warn', message: 'High memory usage', category: 'system' },
        { id: '3', timestamp: new Date().toISOString(), level: 'error', message: 'Connection failed', category: 'network' },
        { id: '4', timestamp: new Date().toISOString(), level: 'debug', message: 'Debug info', category: 'debug' },
    ] as TestLogEntry[],
    emptyLogs: [] as TestLogEntry[],
}

// ============================================================================
// SSE Mock 유틸리티
// ============================================================================

/**
 * SSE 이벤트 포맷으로 변환
 */
export function formatSSEEvent(data: object): string {
    return `data: ${JSON.stringify(data)}\n\n`
}

/**
 * SSE 스트림 Mock 설정
 * Playwright route.fulfill()은 문자열만 지원하므로,
 * 초기 로그는 문자열로 제공하고, 추가 이벤트는 page.evaluate로 시뮬레이션
 */
export async function mockSSEStream(
    page: Page,
    options: {
        logs?: TestLogEntry[];
        shouldFail?: boolean;
    } = {}
): Promise<{ sendLog: (log: object) => Promise<void>; close: () => Promise<void> }> {
    const { logs = [], shouldFail = false } = options

    await page.route('**/api/logs/stream', async (route: Route) => {
        if (shouldFail) {
            await route.abort('connectionfailed')
            return
        }

        // 초기 로그들을 SSE 포맷 문자열로 변환
        const sseBody = logs.map(log => formatSSEEvent(log)).join('')

        await route.fulfill({
            status: 200,
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
            body: sseBody,
        })
    })

    return {
        /**
         * 브라우저 내에서 EventSource의 onmessage를 직접 트리거하여
         * 실시간 로그 수신을 시뮬레이션
         */
        sendLog: async (log: object) => {
            await page.evaluate((logData) => {
                // LogsPage에서 사용하는 상태 업데이트 시뮬레이션
                // window에 저장된 React setState를 직접 호출하거나,
                // Custom Event를 dispatch하여 처리
                const event = new CustomEvent('__test_sse_log__', { detail: logData })
                window.dispatchEvent(event)
            }, log)
        },
        close: async () => {
            await page.unroute('**/api/logs/stream')
        }
    }
}

/**
 * History API Mock 설정
 */
export async function mockHistoryAPI(
    page: Page,
    options: {
        logs?: TestLogEntry[];
        shouldFail?: boolean;
        status?: number;
    } = {}
): Promise<void> {
    const { logs = [], shouldFail = false, status = 200 } = options

    await page.route('**/api/logs/history', async (route: Route) => {
        if (shouldFail) {
            // status가 명시적으로 0이어도 올바르게 처리하기 위해 ?? 사용
            const failStatus = status !== 200 ? status : 500
            await route.fulfill({
                status: failStatus,
                body: JSON.stringify({ error: 'Internal Server Error' }),
            })
            return
        }

        await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logs),
        })
    })
}

/**
 * SSE 연결 실패 Mock
 */
export async function mockSSEConnectionFailure(page: Page): Promise<void> {
    await page.route('**/api/logs/stream', async (route: Route) => {
        await route.abort('connectionfailed')
    })
}

/**
 * SSE 연결 복구 Mock
 */
export async function mockSSEConnectionRecovery(
    page: Page,
    logs: TestLogEntry[] = []
): Promise<void> {
    await page.unroute('**/api/logs/stream')
    await mockSSEStream(page, { logs })
}

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * Logs 페이지로 이동 및 로드 대기
 */
export async function navigateToLogsPage(page: Page): Promise<void> {
    await page.goto('/logs')
    await page.waitForLoadState('networkidle')
    await expect(page.locator(SELECTORS.pageTitle)).toBeVisible({ timeout: TIMEOUTS.medium })
}

/**
 * 연결 상태 확인
 */
export async function expectConnectionStatus(
    page: Page,
    status: 'connecting' | 'connected' | 'disconnected' | 'error'
): Promise<void> {
    const statusText = status === 'error' ? 'Connection Failed' : status
    await expect(page.locator(SELECTORS.connectionStatus)).toContainText(statusText, {
        timeout: TIMEOUTS.long,
        ignoreCase: true
    })
}

/**
 * 연결 인디케이터 색상 확인
 */
export async function expectConnectionIndicatorColor(
    page: Page,
    expectedColor: 'green' | 'yellow' | 'red' | 'gray'
): Promise<void> {
    const colorClass = {
        green: 'bg-green-500',
        yellow: 'bg-yellow-500',
        red: 'bg-red-500',
        gray: 'bg-gray-400',
    }[expectedColor]

    const indicator = page.locator(SELECTORS.connectionIndicator)
    await expect(indicator).toHaveClass(new RegExp(colorClass), { timeout: TIMEOUTS.medium })
}

/**
 * 로그 카운트 확인
 */
export async function expectLogCount(page: Page, count: number): Promise<void> {
    await expect(page.locator(SELECTORS.totalCount)).toContainText(`Total: ${count}`, {
        timeout: TIMEOUTS.medium
    })
}

/**
 * 로그 목록에서 특정 메시지 존재 확인
 */
export async function expectLogMessage(
    page: Page,
    message: string,
    shouldExist: boolean = true
): Promise<void> {
    const logEntry = page.locator(SELECTORS.logContainer).locator(`text=${message}`)
    if (shouldExist) {
        await expect(logEntry).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(logEntry).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 로그 레벨 필터 선택
 */
export async function selectLogLevel(page: Page, level: string): Promise<void> {
    // 필터 아이콘 옆의 레벨 드롭다운 버튼 찾기
    // LogViewer 툴바의 Filter 아이콘(lucide-filter) 다음에 오는 버튼
    const filterSection = page.locator('div.flex.items-center.gap-1.border-l').first()
    const levelButton = filterSection.locator('button').first()
    await levelButton.click()

    // 드롭다운 메뉴에서 레벨 선택
    await page.locator(`[role="menuitem"]:has-text("${level}")`).click()
}

/**
 * 검색어 입력
 */
export async function searchLogs(page: Page, searchText: string): Promise<void> {
    const searchInput = page.locator(SELECTORS.searchInput)
    await searchInput.fill(searchText)
}

/**
 * 로그 일시정지/재개 토글
 */
export async function togglePause(page: Page): Promise<void> {
    // Pause 또는 Play 버튼 클릭
    const pauseBtn = page.locator('button:has(svg.lucide-pause)')
    const playBtn = page.locator('button:has(svg.lucide-play)')

    if (await pauseBtn.isVisible()) {
        await pauseBtn.click()
    } else if (await playBtn.isVisible()) {
        await playBtn.click()
    }
}

/**
 * 로그 일시정지 상태 확인
 */
export async function expectPaused(page: Page, isPaused: boolean): Promise<void> {
    if (isPaused) {
        await expect(page.locator(SELECTORS.pausedIndicator)).toBeVisible({ timeout: TIMEOUTS.short })
    } else {
        await expect(page.locator(SELECTORS.liveIndicator)).toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 로그 초기화
 */
export async function clearLogs(page: Page): Promise<void> {
    await page.locator(SELECTORS.clearButton).click()
}

/**
 * 로그 내보내기
 */
export async function exportLogs(page: Page, format: 'json' | 'csv'): Promise<void> {
    // Export 버튼 클릭
    await page.locator(SELECTORS.exportButton).click()

    // 포맷 선택
    if (format === 'json') {
        await page.locator(SELECTORS.exportJsonOption).click()
    } else {
        await page.locator(SELECTORS.exportCsvOption).click()
    }
}

/**
 * 히스토리 에러 메시지 확인
 */
export async function expectHistoryError(page: Page, shouldShow: boolean = true): Promise<void> {
    const errorElement = page.locator(SELECTORS.historyError)
    if (shouldShow) {
        await expect(errorElement).toBeVisible({ timeout: TIMEOUTS.medium })
    } else {
        await expect(errorElement).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * 파싱 에러 카운트 확인
 */
export async function expectParseErrorCount(page: Page, count: number): Promise<void> {
    const parseErrorElement = page.locator(SELECTORS.parseErrorCount)
    if (count > 0) {
        const errorText = count === 1 ? '1 parse error' : `${count} parse errors`
        await expect(parseErrorElement).toContainText(errorText, {
            timeout: TIMEOUTS.medium
        })
    } else {
        // 파싱 에러가 없어야 할 때 에러 표시가 없는지 확인
        await expect(parseErrorElement).not.toBeVisible({ timeout: TIMEOUTS.short })
    }
}

/**
 * Retry 버튼 클릭
 */
export async function clickRetry(page: Page): Promise<void> {
    await page.locator(SELECTORS.retryButton).click()
}

/**
 * 대량 로그 생성 (테스트용)
 */
export function generateBulkLogs(count: number): TestLogEntry[] {
    const levels = ['info', 'warn', 'error', 'debug'] as const
    const categories = ['server', 'system', 'network', 'database', 'auth']

    return Array.from({ length: count }, (_, i) => ({
        id: `log-${i + 1}`,
        timestamp: new Date(Date.now() + i * 100).toISOString(),
        level: levels[i % levels.length],
        message: `Log message ${i + 1}`,
        category: categories[i % categories.length],
    }))
}

/**
 * 잘못된 JSON 형식의 로그 (파싱 에러 테스트용)
 */
export function generateInvalidLog(): string {
    return 'invalid json {'
}
