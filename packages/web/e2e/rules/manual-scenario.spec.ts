/**
 * 수동 시나리오 테스트
 * 사용자 요청: 생성(1234, ㅁㄴㅇㄹ) → 수정(5678, ㅋㅌㅊㅍ)
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    navigateToRulesPage,
    selectRule,
    enterEditMode,
    saveEdit,
    cleanupRule,
    expectRuleInList,
    expectToast,
    fillMonacoEditor,
} from './rules.helpers'

test.describe('Manual Scenario Test', () => {
    test('생성(1234) → 수정(5678) 시나리오', async ({ page }) => {
        await navigateToRulesPage(page)

        // ====================================================================
        // Step 1: Rule 생성 (제목: 1234, 내용: ㅁㄴㅇㄹ)
        // ====================================================================
        console.log('Step 1: Rule 생성 시작')

        // 모달 열기
        await page.locator(SELECTORS.addButton).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()

        // 입력
        await page.fill(SELECTORS.nameInput, '1234')
        // Monaco Editor에 내용 입력
        const monacoEditor = page.locator('div[role="dialog"] .monaco-editor')
        await monacoEditor.click()
        await page.keyboard.type('ㅁㄴㅇㄹ', { delay: 0 })

        // 생성
        await page.locator(SELECTORS.createButton).click()

        // 생성 확인
        await expectToast(page, /created|success/i)
        await expectRuleInList(page, '1234', true)
        console.log('✅ Step 1 완료: Rule "1234" 생성됨')

        // 생성 후 편집 모드일 수 있으므로 취소
        const cancelBtn = page.locator(SELECTORS.cancelButton)
        if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await cancelBtn.click()
        }

        // ====================================================================
        // Step 2: Rule 수정 (제목: 5678, 내용: ㅋㅌㅊㅍ)
        // ====================================================================
        console.log('Step 2: Rule 수정 시작')

        // Rule 선택
        await selectRule(page, '1234')

        // 편집 모드 진입
        await enterEditMode(page)

        // 이름 수정
        await page.locator(SELECTORS.editNameInput).clear()
        await page.fill(SELECTORS.editNameInput, '5678')

        // 내용 수정 (Monaco Editor 사용)
        await fillMonacoEditor(page, 'div[role="region"][aria-label="Rule content editor"]', 'ㅋㅌㅊㅍ', true)

        // 저장
        await saveEdit(page)

        // 수정 확인
        await expectToast(page, /saved|success/i)
        await expectRuleInList(page, '5678', true)

        // 내용 확인
        await selectRule(page, '5678')
        const editorContent = page.locator(SELECTORS.editorContent)
        await expect(editorContent).toContainText('ㅋㅌㅊㅍ')

        console.log('✅ Step 2 완료: Rule "5678"로 수정됨, 내용: ㅋㅌㅊㅍ')

        // ====================================================================
        // Cleanup
        // ====================================================================
        await cleanupRule(page, '5678')
        console.log('✅ Cleanup 완료')
    })
})
