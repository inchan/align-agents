# Rules UI E2E 테스트 구현 계획

## 개요

`docs/e2e-tests/scenarios/rules.md`에 정의된 23개 시나리오를 Playwright E2E 테스트로 구현하는 계획입니다.

---

## 현황 분석

### 기존 테스트 구조

| 파일 | 테스트 수 | 상태 |
|------|----------|------|
| `rules-management.spec.ts` | 8개 | 기본 CRUD 존재, 리팩토링 필요 |
| `crud-refresh.spec.ts` | 3개 | 일부 Rules 테스트 포함 |
| 기타 | - | MCP, Navigation 등 |

### 기존 코드 문제점

1. **URL 하드코딩**: `http://localhost:3000` vs config의 `http://localhost:5173`
2. **셀렉터 불일치**: role, text, CSS 혼용
3. **중복 코드**: Rule 생성 로직이 여러 테스트에 반복
4. **타임아웃 불일치**: 5000ms, 10000ms 혼용
5. **데이터 정리 없음**: 테스트 후 cleanup 없음

### 시나리오 매핑 현황

| 시나리오 | 기존 테스트 | 신규 필요 |
|----------|-------------|-----------|
| R-001 (목록 조회) | 부분 존재 | 보완 필요 |
| R-002 (선택/보기) | 없음 | 신규 |
| R-003 (생성 모달) | 없음 | 신규 |
| R-004 (생성 성공) | 존재 | 리팩토링 |
| R-005 (편집 진입) | 없음 | 신규 |
| R-006 (편집 저장) | 존재 | 리팩토링 |
| R-007 (편집 취소) | 없음 | 신규 |
| R-008 (삭제 다이얼로그) | 없음 | 신규 |
| R-009 (삭제 성공) | 존재 | 리팩토링 |
| R-010 ~ R-023 | 없음 | 신규 |

---

## 구현 전략

### 1. 파일 구조

```
packages/web/e2e/
├── rules/                          # Rules 테스트 디렉토리 (신규)
│   ├── rules.setup.ts              # 공통 Setup/Teardown
│   ├── rules-core.spec.ts          # P0: 핵심 CRUD (R-001~R-009, R-013)
│   ├── rules-validation.spec.ts    # P0: 유효성 검증 (R-014~R-016)
│   ├── rules-edge.spec.ts          # P1: 엣지 케이스 (R-017~R-021)
│   └── rules-accessibility.spec.ts # P2: 접근성 (R-022~R-023)
├── rules-management.spec.ts        # 기존 파일 (deprecated 또는 삭제)
└── ...
```

### 2. 우선순위별 구현 순서

| Phase | 우선순위 | 시나리오 | 예상 시간 |
|-------|----------|----------|-----------|
| **Phase 1** | P0 | R-001~R-009, R-013~R-015, R-020 | 4시간 |
| **Phase 2** | P1 | R-011, R-012, R-016, R-019 | 2시간 |
| **Phase 3** | P2 | R-010, R-017, R-018, R-021~R-023 | 2시간 |

---

## Phase 1: 핵심 기능 (P0)

### 1.1 Setup 파일 생성

**파일**: `packages/web/e2e/rules/rules.setup.ts`

```typescript
// 공통 상수
export const SELECTORS = {
    // 목록 영역
    rulesList: '[data-testid="rules-list"]',
    ruleItem: (name: string) => `div.group:has-text("${name}")`,
    dragHandle: 'button[class*="cursor-grab"]',
    deleteButton: 'button[title="Delete"]',

    // 에디터 영역
    editor: '[data-testid="rules-editor"]',
    editButton: 'button:has-text("Edit")',
    saveButton: 'button:has-text("Save")',
    cancelButton: 'button:has-text("Cancel")',

    // 모달
    createModal: 'div[role="dialog"]',
    nameInput: 'input#ruleName',
    contentTextarea: 'textarea#ruleContent',
    createButton: 'button:has-text("Create")',

    // 삭제 다이얼로그
    deleteDialog: 'div[role="dialog"]:has-text("Delete Rule")',
    confirmDeleteButton: 'button[variant="destructive"]:has-text("Delete")',
}

export const TIMEOUTS = {
    short: 3000,
    medium: 5000,
    long: 10000,
}

// 헬퍼 함수
export async function createRule(page, name: string, content: string) {
    await page.getByRole('button', { name: '+' }).click()
    await page.fill(SELECTORS.nameInput, name)
    await page.fill(SELECTORS.contentTextarea, content)
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(page.getByText(name)).toBeVisible({ timeout: TIMEOUTS.medium })
}

export async function deleteRule(page, name: string) {
    const ruleItem = page.locator(SELECTORS.ruleItem(name))
    await ruleItem.hover()
    await ruleItem.locator(SELECTORS.deleteButton).click()
    await page.locator(SELECTORS.deleteDialog).locator('button:has-text("Delete")').click()
    await expect(page.getByText(name)).not.toBeVisible({ timeout: TIMEOUTS.medium })
}

export function generateUniqueName(prefix: string = 'Test Rule') {
    return `${prefix} ${Date.now()}`
}
```

### 1.2 핵심 CRUD 테스트

**파일**: `packages/web/e2e/rules/rules-core.spec.ts`

```typescript
import { test, expect } from '@playwright/test'
import { SELECTORS, TIMEOUTS, createRule, deleteRule, generateUniqueName } from './rules.setup'

test.describe('Rules Core - P0', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/rules')
        await page.waitForLoadState('networkidle')
    })

    // R-001: Rule 목록 조회
    test('R-001: should display rules list', async ({ page }) => {
        await expect(page.getByRole('heading', { name: 'Rules' })).toBeVisible()
        // 목록 패널 확인
        // 드래그 핸들 확인
    })

    // R-002: Rule 선택 및 내용 보기
    test('R-002: should select and view rule content', async ({ page }) => {
        // 첫 번째 Rule 클릭
        // 우측 에디터에 내용 표시 확인
        // 두 번째 Rule 클릭
        // 내용 변경 확인
    })

    // R-003: Rule 생성 모달 열기/닫기
    test('R-003: should open and close create modal', async ({ page }) => {
        await page.getByRole('button', { name: '+' }).click()
        await expect(page.locator(SELECTORS.createModal)).toBeVisible()
        await page.getByRole('button', { name: 'Cancel' }).click()
        await expect(page.locator(SELECTORS.createModal)).not.toBeVisible()
    })

    // R-004: Rule 생성 성공
    test('R-004: should create a new rule', async ({ page }) => {
        const ruleName = generateUniqueName()
        await createRule(page, ruleName, '# Test Content')
        await expect(page.getByText('Rule created successfully')).toBeVisible()
    })

    // ... R-005 ~ R-009, R-013
})
```

### 1.3 유효성 검증 테스트

**파일**: `packages/web/e2e/rules/rules-validation.spec.ts`

```typescript
test.describe('Rules Validation - P0', () => {
    // R-014: 빈 이름 검증
    test('R-014: should disable create button for empty name', async ({ page }) => {
        await page.getByRole('button', { name: '+' }).click()
        await page.fill(SELECTORS.contentTextarea, 'Some content')
        await expect(page.getByRole('button', { name: 'Create' })).toBeDisabled()
    })

    // R-015: 중복 이름 검증
    test('R-015: should show error for duplicate name', async ({ page }) => {
        const ruleName = generateUniqueName()
        await createRule(page, ruleName, 'Content 1')

        // 같은 이름으로 다시 생성 시도
        await page.getByRole('button', { name: '+' }).click()
        await page.fill(SELECTORS.nameInput, ruleName)
        await page.fill(SELECTORS.contentTextarea, 'Content 2')
        await page.getByRole('button', { name: 'Create' }).click()

        // 에러 확인 (구현 상태에 따라 조정)
        await expect(page.getByText(/already exists|중복/i)).toBeVisible()
    })

    // R-020: 미저장 경고
    test('R-020: should handle unsaved changes when switching rules', async ({ page }) => {
        // Rule A 선택 후 편집
        // 저장하지 않고 Rule B 클릭
        // 동작 확인
    })
})
```

---

## Phase 2: 에러 처리 및 UX (P1)

**파일**: `packages/web/e2e/rules/rules-edge.spec.ts`

```typescript
test.describe('Rules Edge Cases - P1', () => {
    // R-011: 생성 실패 (네트워크 에러)
    test('R-011: should show error on create failure', async ({ page }) => {
        // API 라우트 차단
        await page.route('**/api/rules', route => route.abort())

        await page.getByRole('button', { name: '+' }).click()
        await page.fill(SELECTORS.nameInput, 'Test')
        await page.fill(SELECTORS.contentTextarea, 'Content')
        await page.getByRole('button', { name: 'Create' }).click()

        await expect(page.getByText(/Failed to create/i)).toBeVisible()
    })

    // R-016: 특수문자 처리
    // R-019: Active Rule 기본 선택
})
```

---

## Phase 3: 부가 기능 (P2)

**파일**: `packages/web/e2e/rules/rules-accessibility.spec.ts`

```typescript
test.describe('Rules Accessibility - P2', () => {
    // R-010: 드래그앤드롭
    test('R-010: should reorder rules via drag and drop', async ({ page }) => {
        // DnD Kit 테스트
    })

    // R-022: 키보드 네비게이션
    test('R-022: should support keyboard navigation', async ({ page }) => {
        await page.goto('/rules')
        await page.keyboard.press('Tab')
        // 포커스 이동 확인
        await page.keyboard.press('Enter')
        // 선택 확인
    })

    // R-023: Tooltip 확인
    test('R-023: should show tooltip for long names', async ({ page }) => {
        const longName = 'A'.repeat(60)
        await createRule(page, longName, 'Content')

        const ruleItem = page.locator(SELECTORS.ruleItem(longName.substring(0, 20)))
        await ruleItem.hover()

        // title 속성 확인
        await expect(ruleItem).toHaveAttribute('title', longName)
    })
})
```

---

## 실행 전략

### CI/CD 통합

```yaml
# .github/workflows/e2e.yml
e2e-test:
  runs-on: ubuntu-latest
  steps:
    - uses: actions/checkout@v4
    - name: Install dependencies
      run: npm ci
    - name: Install Playwright
      run: npx playwright install --with-deps
    - name: Run P0 tests
      run: npm run test:e2e -- --grep "P0"
    - name: Run P1 tests (optional)
      run: npm run test:e2e -- --grep "P1"
      continue-on-error: true
```

### 로컬 실행

```bash
# 전체 실행
npm run test:e2e

# 우선순위별 실행
npm run test:e2e -- --grep "P0"
npm run test:e2e -- --grep "R-001"

# UI 모드
npm run test:e2e:ui
```

---

## 체크리스트

### Phase 1 완료 기준

- [ ] `rules.setup.ts` 생성
- [ ] `rules-core.spec.ts` - R-001~R-009, R-013 (11개)
- [ ] `rules-validation.spec.ts` - R-014, R-015, R-020 (3개)
- [ ] 모든 P0 테스트 통과
- [ ] 기존 `rules-management.spec.ts` 정리

### Phase 2 완료 기준

- [ ] `rules-edge.spec.ts` - R-011, R-012, R-016, R-019 (4개)
- [ ] 네트워크 에러 시뮬레이션 동작
- [ ] 모든 P1 테스트 통과

### Phase 3 완료 기준

- [ ] `rules-accessibility.spec.ts` - R-010, R-017, R-018, R-021~R-023 (6개)
- [ ] 드래그앤드롭 테스트 안정화
- [ ] 키보드 네비게이션 검증
- [ ] 모든 P2 테스트 통과

---

## 리스크 및 대응

| 리스크 | 영향 | 대응 |
|--------|------|------|
| API 서버 불안정 | 테스트 실패 | `test.retry(2)` 설정 |
| 드래그앤드롭 불안정 | P2 테스트 실패 | Playwright의 `dragTo` API 사용 |
| 토스트 메시지 타이밍 | assertion 실패 | `waitForSelector` 또는 타임아웃 증가 |
| 기존 테스트 충돌 | 병렬 실행 문제 | 고유 이름 생성기 사용 |

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-12-08 | 초기 계획 작성 |
