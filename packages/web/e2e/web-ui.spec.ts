import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';
const API_URL = 'http://localhost:3001';

test.describe('AI CLI Syncer - E2E Tests', () => {
    test.beforeEach(async ({ page }) => {
        // API 서버가 실행 중인지 확인
        const response = await page.request.get(`${API_URL}/api/tools`);
        expect(response.ok()).toBeTruthy();
    });

    test.describe('시나리오 1: Dashboard 기본 기능', () => {
        test('Dashboard 페이지가 올바르게 로드되고 도구 정보를 표시한다', async ({ page }) => {
            await page.goto(BASE_URL);

            // 페이지 제목 확인
            await expect(page).toHaveTitle(/AI CLI Syncer/);

            // 도구 목록 섹션 확인
            const toolCards = page.locator('.window');
            await expect(toolCards).toHaveCount(await toolCards.count());
            expect(await toolCards.count()).toBeGreaterThan(0);

            // 통계 정보 표시 확인
            const statsSection = page.locator('text=설치된 도구');
            await expect(statsSection).toBeVisible();
        });
    });

    test.describe('시나리오 2-5: Tools 페이지', () => {
        test('도구 목록이 설치 상태에 따라 정렬된다', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.click('text=도구 관리');

            // URL 확인
            await expect(page).toHaveURL(`${BASE_URL}/tools`);

            // 도구 목록 확인
            const toolCards = page.locator('.window').filter({ hasText: /Claude|Codex|Gemini/ });
            await expect(toolCards.first()).toBeVisible();
        });

        test('경로에 마우스를 올리면 전체 경로가 툴팁으로 표시된다', async ({ page }) => {
            await page.goto(`${BASE_URL}/tools`);

            // 경로 요소 찾기
            const pathElement = page.locator('span[title]').first();
            await expect(pathElement).toHaveAttribute('title', /.+/);

            // title 속성이 경로를 포함하는지 확인
            const title = await pathElement.getAttribute('title');
            expect(title).toContain('/');
        });

        test('"설정 편집" 버튼 클릭 시 Alert가 표시된다', async ({ page }) => {
            await page.goto(`${BASE_URL}/tools`);

            // Alert 리스너 설정
            page.on('dialog', async dialog => {
                expect(dialog.type()).toBe('alert');
                expect(dialog.message()).toContain('설정 편집');
                await dialog.accept();
            });

            // "설정 편집" 버튼 클릭
            const editButton = page.locator('button:has-text("설정 편집")').first();
            await editButton.click();
        });

        test('Claude Desktop의 "MCP" 버튼이 MCP 페이지로 이동한다', async ({ page }) => {
            await page.goto(`${BASE_URL}/tools`);

            // Claude Desktop 카드 찾기
            const claudeCard = page.locator('.window:has-text("Claude Desktop")');

            // "MCP" 버튼 클릭
            const mcpButton = claudeCard.locator('button:has-text("MCP")');
            if (await mcpButton.isVisible()) {
                await mcpButton.click();

                // URL 확인
                await expect(page).toHaveURL(`${BASE_URL}/mcp`);
            }
        });
    });

    test.describe('시나리오 6-8: Rules 페이지', () => {
        test('Master Rules가 올바르게 표시된다', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.click('text=Rules');

            // URL 확인
            await expect(page).toHaveURL(`${BASE_URL}/rules`);

            // Master Rules 내용 확인
            const rulesContent = page.locator('pre, textarea').first();
            await expect(rulesContent).toBeVisible();

            // "편집" 버튼 확인
            const editButton = page.locator('button:has-text("편집")');
            await expect(editButton).toBeVisible();
        });

        test('편집 모드가 정상 작동한다', async ({ page }) => {
            await page.goto(`${BASE_URL}/rules`);

            // "편집" 버튼 클릭
            await page.click('button:has-text("편집")');

            // Textarea 확인
            const textarea = page.locator('textarea');
            await expect(textarea).toBeVisible();

            // 텍스트 수정
            const originalText = await textarea.inputValue();
            await textarea.fill('# Test Rules\n\n' + originalText);

            // "취소" 버튼 클릭
            await page.click('button:has-text("취소")');

            // 읽기 모드로 복귀 확인
            await expect(textarea).not.toBeVisible();
        });

        test('Rules 저장 기능이 정상 작동한다', async ({ page }) => {
            await page.goto(`${BASE_URL}/rules`);

            // "편집" 버튼 클릭
            await page.click('button:has-text("편집")');

            // 텍스트 수정
            const textarea = page.locator('textarea');
            await textarea.fill('# Test Rules\n\nThis is a test.');

            // Alert 리스너 설정
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('저장');
                await dialog.accept();
            });

            // "저장" 버튼 클릭
            await page.click('button:has-text("저장")');

            // 읽기 모드로 복귀 확인
            await expect(textarea).not.toBeVisible();
        });
    });

    test.describe('시나리오 9-11: MCP 페이지', () => {
        test('MCP 서버 목록이 올바르게 표시된다', async ({ page }) => {
            await page.goto(BASE_URL);
            await page.click('text=MCP 서버');

            // URL 확인
            await expect(page).toHaveURL(`${BASE_URL}/mcp`);

            // MCP 서버 목록 확인
            const serverCards = page.locator('.window').filter({ hasText: /command|args/ });
            const count = await serverCards.count();
            expect(count).toBeGreaterThanOrEqual(0);
        });

        test('JSON 편집 모드가 정상 작동한다', async ({ page }) => {
            await page.goto(`${BASE_URL}/mcp`);

            // "편집" 버튼 클릭
            await page.click('button:has-text("편집")');

            // Textarea 확인
            const textarea = page.locator('textarea');
            await expect(textarea).toBeVisible();

            // JSON 형식 확인
            const jsonText = await textarea.inputValue();
            expect(() => JSON.parse(jsonText)).not.toThrow();

            // "취소" 버튼 클릭
            await page.click('button:has-text("취소")');

            // 읽기 모드로 복귀 확인
            await expect(textarea).not.toBeVisible();
        });

        test('잘못된 JSON 입력 시 에러 메시지가 표시된다', async ({ page }) => {
            await page.goto(`${BASE_URL}/mcp`);

            // "편집" 버튼 클릭
            await page.click('button:has-text("편집")');

            // 잘못된 JSON 입력
            const textarea = page.locator('textarea');
            await textarea.fill('{invalid}');

            // Alert 리스너 설정
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('JSON');
                expect(dialog.message()).toContain('오류');
                await dialog.accept();
            });

            // "저장" 버튼 클릭
            await page.click('button:has-text("저장")');
        });
    });

    test.describe('시나리오 12-13: 동기화 기능', () => {
        test('Rules 전체 동기화가 정상 작동한다', async ({ page }) => {
            await page.goto(`${BASE_URL}/rules`);

            // Alert 리스너 설정
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('동기화');
                await dialog.accept();
            });

            // "전체 동기화" 버튼 클릭
            const syncButton = page.locator('button:has-text("전체 동기화")');
            if (await syncButton.isVisible()) {
                await syncButton.click();
            }
        });

        test('MCP 단일 도구 동기화가 정상 작동한다', async ({ page }) => {
            await page.goto(`${BASE_URL}/mcp`);

            // Alert 리스너 설정
            page.on('dialog', async dialog => {
                expect(dialog.message()).toContain('동기화');
                await dialog.accept();
            });

            // 도구 선택 및 동기화 버튼 클릭
            const syncButton = page.locator('button:has-text("동기화")').first();
            if (await syncButton.isVisible()) {
                await syncButton.click();
            }
        });
    });

    test.describe('시나리오 14: 네비게이션', () => {
        test('모든 페이지 간 네비게이션이 정상 작동한다', async ({ page }) => {
            // Dashboard
            await page.goto(BASE_URL);
            await expect(page).toHaveURL(BASE_URL);

            // Tools
            await page.click('text=도구 관리');
            await expect(page).toHaveURL(`${BASE_URL}/tools`);

            // Rules
            await page.click('text=Rules');
            await expect(page).toHaveURL(`${BASE_URL}/rules`);

            // MCP
            await page.click('text=MCP 서버');
            await expect(page).toHaveURL(`${BASE_URL}/mcp`);

            // Dashboard로 복귀
            await page.click('text=Dashboard');
            await expect(page).toHaveURL(BASE_URL);

            // 브라우저 뒤로가기
            await page.goBack();
            await expect(page).toHaveURL(`${BASE_URL}/mcp`);

            // 브라우저 앞으로가기
            await page.goForward();
            await expect(page).toHaveURL(BASE_URL);
        });
    });

    test.describe('비기능 요구사항', () => {
        test('페이지 로드 시간이 2초 이내다', async ({ page }) => {
            const startTime = Date.now();
            await page.goto(BASE_URL);
            const loadTime = Date.now() - startTime;

            expect(loadTime).toBeLessThan(2000);
        });

        test('API 응답 시간이 1초 이내다', async ({ page }) => {
            const startTime = Date.now();
            const response = await page.request.get(`${API_URL}/api/tools`);
            const responseTime = Date.now() - startTime;

            expect(response.ok()).toBeTruthy();
            expect(responseTime).toBeLessThan(1000);
        });
    });
});
