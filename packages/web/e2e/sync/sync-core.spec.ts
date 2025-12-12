/**
 * Sync Core E2E Tests - P0 (필수)
 * @priority P0
 * @.claude/commands/generate-ui-scenarios.md S-001, S-002, S-003, S-004, S-005, S-006, S-007, S-008, S-009
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    navigateToSyncPage,
    selectToolSet,
    createToolSet,
    deleteToolSet,
    selectRules,
    selectMcpSet,
    executeSyncAction
} from './sync.helpers'
import { resetDatabase, seedMcpData } from '../mcp/mcp.helpers'

test.describe('Sync Core - P0 @priority-p0', () => {
    
    test.beforeEach(async ({ page, request }) => {
        // DB 초기화
        await resetDatabase(request)
        
        // Seed MCP Servers (MCP 컬럼 테스트용)
        await seedMcpData(request, {
            sets: [
                { id: 'mcp-set-1', name: 'Test MCP Set', items: [] }
            ]
        })
        
        // Seed Rules (Rules 컬럼 테스트용)
        await request.post('/api/rules', {
            data: { name: 'Test Rule', content: '# Test Content' }
        })

        // Seed Target Tools (Tools 컬럼 및 Set 생성 테스트용)
        // 로컬 환경의 tools-registry.json에 의존하지 않도록 명시적으로 추가
        const toolsToAdd = [
            // configPath는 백엔드 서버 기준 존재하는 파일이어야 함 (cli 패키지 내 package.json 사용)
            { name: 'CLI Tool', configPath: 'package.json', description: 'Test CLI Tool' }, 
            { name: 'Desktop Tool', configPath: 'package.json', description: 'Test Desktop Tool' }
        ]

        for (const tool of toolsToAdd) {
            // 이미 존재할 수 있으므로 에러 무시 (혹은 삭제 후 재생성)
            // 삭제 시도
            const id = tool.name.toLowerCase().replace(/\s+/g, '-');
            await request.delete(`/api/tools/${id}`).catch(() => {});
            
            // 생성
            await request.post('/api/tools', {
                data: tool
            }).catch(e => console.log(`Failed to add tool ${tool.name}:`, e));
        }

        await navigateToSyncPage(page)
    })

    // 테스트 후 시딩된 도구 정리 (프로덕션 registry 오염 방지)
    test.afterEach(async ({ request }) => {
        const testToolIds = ['cli-tool', 'desktop-tool'];
        for (const id of testToolIds) {
            await request.delete(`/api/tools/${id}`).catch(() => {});
        }
    })

    // ========================================================================
    // S-001: Sync 페이지 진입 및 초기 상태 확인
    // ========================================================================
    test('S-001: should display sync page with required components', async ({ page }) => {
        await expect(page.locator(SELECTORS.toolSetColumn)).toBeVisible()
        await expect(page.locator(SELECTORS.rulesColumn)).toBeVisible()
        await expect(page.locator(SELECTORS.mcpColumn)).toBeVisible()
        
        // Sync 버튼 (Header) 확인
        await expect(page.locator(SELECTORS.syncButton)).toBeVisible()
    })

    // ========================================================================
    // S-002: 기본 Tool Set 변경 확인
    // ========================================================================
    test('S-002: should change basic Tool Set', async ({ page }) => {
        // "All Tools"가 기본 선택 상태인지 확인
        await expect(page.locator(SELECTORS.toolSetCard('All Tools'))).toHaveClass(/border-primary/)
        
        // "CLI Tools" 선택 (위에서 시딩한 'CLI Tool'이 있으면 자동 생성됨)
        // 만약 CLI 타입으로 자동 분류되지 않으면 테스트 실패 가능성 있음.
        // SyncPage 로직: id에 'desktop' 있으면 desktop, 'ide'/'cursor' 등 있으면 ide, 나머지는 cli
        // 'CLI Tool' -> id: 'cli-tool' -> CLI 타입
        await selectToolSet(page, 'CLI Tools')
    })

    // ========================================================================
    // S-003: 커스텀 Tool Set 생성 및 저장
    // ========================================================================
    test('S-003: should create and save custom Tool Set', async ({ page }) => {
        const setName = 'My Custom Set'
        // 'cli-tool' ID를 가진 툴을 선택
        await createToolSet(page, setName, 'Custom Description', ['cli-tool'])
        
        // 생성된 세트가 목록에 나타나는지 확인
        await expect(page.locator(SELECTORS.toolSetCard(setName))).toBeVisible()
        
        // 생성된 세트 선택
        await selectToolSet(page, setName)
    })

    // ========================================================================
    // S-004: 커스텀 Tool Set 삭제
    // ========================================================================
    test('S-004: should delete custom Tool Set', async ({ page }) => {
        const setName = 'Set To Delete'
        await createToolSet(page, setName, 'Desc', ['cli-tool'])
        await expect(page.locator(SELECTORS.toolSetCard(setName))).toBeVisible()

        await deleteToolSet(page, setName)
        await expect(page.locator(SELECTORS.toolSetCard(setName))).toBeHidden()
    })

    // ========================================================================
    // S-005: Rules 선택 동작 확인
    // ========================================================================
    test('S-005: should select Rules', async ({ page }) => {
        await selectRules(page, 'Test Rule')
    })

    // ========================================================================
    // S-006: MCP Set 선택 동작 확인
    // ========================================================================
    test('S-006: should select MCP Set', async ({ page }) => {
        await selectMcpSet(page, 'Test MCP Set')
    })

    // ========================================================================
    // S-007: 동기화(Sync) 실행 성공 시나리오
    // ========================================================================
    test('S-007: should execute sync successfully', async ({ page }) => {
        await selectToolSet(page, 'All Tools')
        await selectRules(page, 'Test Rule')
        await selectMcpSet(page, 'Test MCP Set')

        // API 응답 Mocking (성공 케이스)
        await page.route('/api/rules/sync', async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true, results: [] }) })
        })
        await page.route('/api/mcp/sync', async route => {
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true, results: [] }) })
        })

        await executeSyncAction(page)
        
        // 성공 Toast 또는 메시지 확인
        await expect(page.getByText(/Sync completed|success/i)).toBeVisible()
    })

    // ========================================================================
    // S-008: 동기화 실패 및 에러 처리
    // ========================================================================
    test('S-008: should handle sync failure', async ({ page }) => {
        await selectToolSet(page, 'All Tools')
        await selectRules(page, 'Test Rule')
        await selectMcpSet(page, 'Test MCP Set')

        // API 응답 Mocking (실패 케이스)
        await page.route('/api/rules/sync', async route => {
            await route.fulfill({ status: 500, body: JSON.stringify({ error: 'Rules Sync Failed' }) })
        })

        await executeSyncAction(page)
        
        // 에러 Toast 또는 메시지 확인
        await expect(page.getByText(/Sync failed/i)).toBeVisible()
    })

    // ========================================================================
    // S-009: 도구 미발견 시 자동 스캔 트리거
    // ========================================================================
    test('S-009: should trigger auto-scan if no tools found', async ({ page }) => {
        // 도구 목록이 비어있는 상태를 Mocking
        await page.route('/api/tools', async route => {
            await route.fulfill({ json: [] })
        })

        // 스캔 API 호출 감지
        let scanCalled = false
        await page.route('/api/tools/scan', async route => {
            scanCalled = true
            await route.fulfill({ json: [] })
        })

        // 페이지 새로고침하여 초기 로드 로직 재실행
        await page.reload()
        
        // 자동 스캔이 트리거되었는지 확인 (비동기 효과 대기)
        await expect.poll(() => scanCalled).toBe(true)
    })
})
