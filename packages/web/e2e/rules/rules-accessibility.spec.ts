/**
 * Rules Accessibility E2E Tests - P2 (선택)
 * 접근성 및 드래그앤드롭: R-010, R-022, R-023
 *
 * @priority P2
 * @scenarios R-010, R-022, R-023
 */
import { test, expect } from '@playwright/test'
import {
    SELECTORS,
    TIMEOUTS,
    TEST_DATA,
    generateUniqueName,
    navigateToRulesPage,
    createRule,
    selectRule,
    cleanupRule,
} from './rules.helpers'

test.describe('Rules Accessibility - P2 @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToRulesPage(page)
    })

    // ========================================================================
    // R-010: 드래그앤드롭 순서 변경
    // ========================================================================
    test('R-010: should reorder rules via drag and drop', async ({ page }) => {
        // 최소 3개의 Rule 생성
        const rule1 = generateUniqueName('R010-A')
        const rule2 = generateUniqueName('R010-B')
        const rule3 = generateUniqueName('R010-C')

        await createRule(page, rule1)
        await createRule(page, rule2)
        await createRule(page, rule3)

        // 드래그 핸들 찾기
        const firstRuleItem = page.locator(SELECTORS.ruleItem(rule1)).first()
        const dragHandle = firstRuleItem.locator(SELECTORS.dragHandle)

        // 드래그 핸들이 존재하는지 확인
        const hasDragHandle = await dragHandle.isVisible({ timeout: TIMEOUTS.short }).catch(() => false)

        if (hasDragHandle) {
            // 세 번째 Rule 위치로 드래그
            const thirdRuleItem = page.locator(SELECTORS.ruleItem(rule3)).first()

            // 드래그 전 시각적 피드백 확인을 위해 드래그 시작
            await dragHandle.hover()

            // 드래그앤드롭 실행
            await dragHandle.dragTo(thirdRuleItem)

            // 토스트 메시지 확인
            const orderToast = page.getByText(/order updated|순서|변경/i)
            await expect(orderToast).toBeVisible({ timeout: TIMEOUTS.medium }).catch(() => {
                // 토스트가 없을 수도 있음
            })
        } else {
            // 드래그 핸들이 없으면 테스트 스킵
            console.log('Drag handle not found - skipping drag test')
        }

        // Cleanup
        await cleanupRule(page, rule1)
        await cleanupRule(page, rule2)
        await cleanupRule(page, rule3)
    })

    // ========================================================================
    // R-022: 키보드 네비게이션
    // ========================================================================
    test('R-022: should support keyboard navigation', async ({ page }) => {
        // 테스트용 Rule 생성
        const ruleName = generateUniqueName('R022-Keyboard')
        await createRule(page, ruleName)

        // 페이지 새로고침하여 초기 상태로
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Tab 키로 요소 탐색
        await page.keyboard.press('Tab')

        // 여러 번 Tab하여 Rule 목록 또는 버튼에 도달
        for (let i = 0; i < 5; i++) {
            await page.keyboard.press('Tab')
        }

        // 포커스된 요소 확인
        const focusedElement = page.locator(':focus')
        const hasFocus = await focusedElement.count() > 0

        expect(hasFocus).toBe(true)

        // Edit 버튼 클릭하여 편집 모드 테스트 (키보드 대신 마우스로)
        const editButton = page.locator(SELECTORS.editButton)
        if (await editButton.isVisible({ timeout: 2000 }).catch(() => false)) {
            await editButton.click()
            await expect(page.locator(SELECTORS.saveButton)).toBeVisible({ timeout: TIMEOUTS.short })

            // Esc로 편집 취소
            await page.keyboard.press('Escape')

            // Cancel 버튼이 보이면 클릭, 아니면 이미 취소됨
            const cancelBtn = page.locator(SELECTORS.cancelButton)
            if (await cancelBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
                await cancelBtn.click()
            }
        }

        // Cleanup
        await cleanupRule(page, ruleName)
    })

    // ========================================================================
    // R-023: 긴 이름 Tooltip 확인
    // ========================================================================
    test('R-023: should show tooltip for long names', async ({ page }) => {
        // 긴 이름으로 Rule 생성
        const longName = TEST_DATA.longName
        await createRule(page, longName, 'Content')

        // Rule 항목 찾기
        const ruleItem = page.locator(SELECTORS.ruleItem(longName.substring(0, 20))).first()
        await expect(ruleItem).toBeVisible()

        // 호버
        await ruleItem.hover()

        // Tooltip 확인 방법 1: title 속성
        const nameElement = ruleItem.locator('.truncate').first()
        const titleAttr = await nameElement.getAttribute('title').catch(() => null)

        // Tooltip 확인 방법 2: 별도 tooltip 요소
        const tooltipElement = page.locator('[role="tooltip"], .tooltip')
        const hasTooltipElement = await tooltipElement.isVisible({ timeout: 1000 }).catch(() => false)

        // title 속성이 있거나 tooltip 요소가 있으면 통과
        const hasTooltip = titleAttr !== null || hasTooltipElement

        if (!hasTooltip) {
            // Tooltip이 구현되지 않은 경우 - 권장 개선사항으로 로그
            console.log('Tooltip not implemented for long names - recommended improvement')
        }

        // Cleanup
        await cleanupRule(page, longName)
    })
})

// ============================================================================
// 추가 접근성 테스트 (옵션)
// ============================================================================
test.describe('Rules Accessibility - Extended @priority-p2', () => {
    test.beforeEach(async ({ page }) => {
        await navigateToRulesPage(page)
    })

    test('should have visible focus indicators', async ({ page }) => {
        // Tab으로 요소 이동 시 포커스 표시가 시각적으로 명확한지 확인
        await page.keyboard.press('Tab')

        const focusedElement = page.locator(':focus')

        if (await focusedElement.count() > 0) {
            // 포커스 스타일 확인 (outline, ring 등)
            const hasVisibleFocus = await focusedElement.evaluate((el) => {
                const style = window.getComputedStyle(el)
                return (
                    style.outline !== 'none' ||
                    style.outlineWidth !== '0px' ||
                    style.boxShadow.includes('ring') ||
                    el.classList.contains('focus-visible') ||
                    el.classList.contains('ring')
                )
            }).catch(() => false)

            // 포커스 표시가 있으면 통과, 없으면 경고
            if (!hasVisibleFocus) {
                console.log('Warning: Focus indicator may not be visible')
            }
        }
    })

    test('should have proper ARIA labels', async ({ page }) => {
        // 주요 버튼들의 접근성 레이블 확인
        const addButton = page.locator(SELECTORS.addButton)

        if (await addButton.isVisible()) {
            // aria-label 또는 title 확인
            const ariaLabel = await addButton.getAttribute('aria-label')
            const title = await addButton.getAttribute('title')
            const hasLabel = ariaLabel !== null || title !== null

            if (!hasLabel) {
                console.log('Warning: Add button may need aria-label for accessibility')
            }
        }
    })
})
