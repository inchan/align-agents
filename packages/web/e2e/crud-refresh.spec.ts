import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('CRUD & UI Refresh Verification', () => {
    test('Rule 생성, 수정, 삭제 후 새로고침 시 데이터가 유지된다', async ({ page }) => {
        console.log('1. Rules 페이지 이동');
        // 1. Rules 페이지 이동
        await page.goto(`${BASE_URL}/rules`);
        await expect(page).toHaveURL(`${BASE_URL}/rules`);

        // 2. Rule 생성 (Create)
        console.log('2. Rule 생성 시작');
        const newRuleName = `Test Rule ${Date.now()}`;
        const newRuleContent = '# New Content';

        await page.click('button:has-text("New Rule")');
        await page.fill('input[placeholder="e.g., Python Project Rules"]', newRuleName);
        await page.fill('textarea[placeholder="Enter rule content..."]', newRuleContent);
        await page.click('button:has-text("Create")');

        // 생성 확인
        console.log('Rule 생성 확인 대기');
        await expect(page.locator(`text=${newRuleName}`).first()).toBeVisible();

        // 3. 새로고침 (Refresh)
        console.log('3. 새로고침 (1차)');
        await page.reload();
        await expect(page.locator(`text=${newRuleName}`).first()).toBeVisible();

        // 4. Rule 선택 및 수정 (Update)
        console.log('4. Rule 선택 및 수정 시작');
        // 목록에서 아이템 클릭 (구체적인 선택자 사용 권장)
        await page.click(`div:has-text("${newRuleName}")`);

        console.log('Edit 버튼 클릭');
        await page.click('button:has-text("Edit")');

        const updatedContent = '# Updated Content';
        console.log('내용 수정 입력');
        const textarea = page.locator('textarea');
        await expect(textarea).toBeVisible();
        await textarea.fill(updatedContent);

        console.log('Save 버튼 클릭');
        await page.click('button:has-text("Save")');

        // 수정 확인
        console.log('수정 내용 확인 대기');
        await expect(page.locator('pre')).toContainText(updatedContent);

        // 5. 새로고침 (Refresh)
        console.log('5. 새로고침 (2차)');
        await page.reload();

        // 선택 상태가 유지되지 않을 수 있으므로 다시 선택
        console.log('Rule 재선택');
        await page.click(`div:has-text("${newRuleName}")`);
        await expect(page.locator('pre')).toContainText(updatedContent);

        // 6. Rule 삭제 (Delete)
        console.log('6. Rule 삭제 시작');
        // 삭제 버튼은 호버 시 나타나므로 강제로 클릭하거나 호버 액션 필요
        // 여기서는 간단히 삭제 버튼을 찾아서 클릭 (UI 구현에 따라 다름)
        // SortableRuleItem 구현을 보면 group-hover:opacity-100 클래스가 있음
        const ruleItem = page.locator(`div.group:has-text("${newRuleName}")`).first();
        await ruleItem.hover();
        await ruleItem.locator('button[title="Delete"]').click();

        // 삭제 확인 다이얼로그
        console.log('삭제 확인 다이얼로그 클릭');
        const deleteDialog = page.locator('div[role="dialog"]');
        await expect(deleteDialog).toBeVisible();
        await expect(deleteDialog).toContainText(newRuleName); // 이름이 제대로 전달되었는지 확인
        // 삭제 요청 응답 대기 설정
        const deleteResponsePromise = page.waitForResponse(response =>
            response.url().includes('/rules') && response.request().method() === 'DELETE'
        );

        // click() 대신 dispatchEvent 사용 (Firefox 호환성)
        await deleteDialog.locator('button:has-text("Delete")').dispatchEvent('click');

        // API 응답 확인
        console.log('삭제 API 응답 대기');
        const deleteResponse = await deleteResponsePromise;
        console.log(`삭제 API 상태 코드: ${deleteResponse.status()}`);
        expect(deleteResponse.status()).toBe(200);

        // 다이얼로그가 닫히는지 확인 (클릭이 제대로 되었는지 검증)
        await expect(deleteDialog).toBeHidden();

        // 삭제 확인
        console.log('삭제 확인 대기');
        await expect(page.locator(`div.group:has-text("${newRuleName}")`)).not.toBeVisible({ timeout: 10000 });

        // 7. 새로고침 (Refresh)
        console.log('7. 새로고침 (3차)');
        await page.reload();
        await expect(page.locator(`div.group:has-text("${newRuleName}")`)).toBeHidden();
        console.log('테스트 완료');
    });
});
