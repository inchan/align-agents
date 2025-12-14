# Dashboard E2E 시나리오 테스트

## 목차

- [개요](#개요)
- [테스트 환경](#테스트-환경)
- [기능 매트릭스](#기능-매트릭스)
- [우선순위 정의](#우선순위-정의)
- [시나리오 목록](#시나리오-목록)
  - [D-001: 대시보드 로딩 상태 표시](#d-001-대시보드-로딩-상태-표시)
  - [D-002: 핵심 지표 카드 표시](#d-002-핵심-지표-카드-표시)
  - [D-003: Tool 상태 그리드 표시](#d-003-tool-상태-그리드-표시)
  - [D-004: Activity Feed 표시](#d-004-activity-feed-표시)
  - [D-005: 자동 갱신 동작 확인](#d-005-자동-갱신-동작-확인)
  - [D-006: 에러 상태 처리](#d-006-에러-상태-처리)
  - [D-007: 빈 데이터 상태 처리](#d-007-빈-데이터-상태-처리)
- [테스트 데이터 Setup](#테스트-데이터-setup)
- [테스트 실행 방법](#테스트-실행-방법)
- [버전 이력](#버전-이력)

---

## 개요

이 문서는 align-agents의 **Dashboard 페이지** UI 시나리오 테스트를 정의합니다.
`/` (루트) 경로의 메인 대시보드에서 Stats, Tool Status, Activity Feed 등 주요 컴포넌트의 표시 및 동작을 검증합니다.

---

## 테스트 환경

- **도구**: Playwright
- **대상 페이지**: `/`
- **베이스 URL**: http://localhost:5173
- **API 서버**: http://localhost:3001

---

## 기능 매트릭스

| 기능 | 시나리오 번호 | 우선순위 |
|------|---------------|----------|
| 대시보드 로딩 | D-001 | P0 |
| 핵심 지표 카드 표시 | D-002 | P0 |
| Tool Grid 표시 | D-003 | P0 |
| Activity Feed 표시 | D-004 | P0 |
| 자동 갱신 | D-005 | P1 |
| 에러 처리 | D-006 | P1 |
| 빈 상태 처리 | D-007 | P2 |

---

## 우선순위 정의

| 우선순위 | 설명 | 릴리즈 기준 |
|----------|------|-------------|
| **P0** | 핵심 기능, 데이터 표시 무결성 | 필수 통과 |
| **P1** | 에러 처리, 자동 갱신 로직 | 권장 통과 |
| **P2** | 부가 기능, 엣지 케이스 | 시간 허용 시 |

---

## 시나리오 목록

### D-001: 대시보드 로딩 상태 표시

**우선순위**: P0
**카테고리**: Core

**목적**: 대시보드 진입 시 데이터 로딩 중임을 사용자에게 적절히 표시하는지 확인

**전제 조건**:
- API 응답에 지연(delay)이 발생한다고 가정

**테스트 단계**:
1. `/` 페이지 접속 (API 응답 지연 설정)
2. StatsCards 영역에 로딩 스켈레톤(Skeleton) 또는 스피너 표시 확인
3. ToolStatusGrid 영역에 로딩 상태 표시 확인
4. ActivityFeed 영역에 로딩 상태 표시 확인

**예상 결과**:
- [ ] 각 주요 섹션에 로딩 인디케이터가 표시됨
- [ ] 레이아웃 깨짐 없이 로딩 상태가 유지됨

---

### D-002: 핵심 지표 카드 표시

**우선순위**: P0
**카테고리**: 조회 (Read)

**목적**: 대시보드의 4가지 핵심 지표 카드가 올바른 데이터를 표시하는지 확인한다.

**전제조건**:
- API가 StatsSummary 데이터를 반환해야 한다.

**테스트 단계**:
1. 대시보드 페이지의 상단 통계 카드 섹션을 확인한다.
2. 다음 4개 카드가 표시되는지 확인한다:
    - **Total Syncs**: 전체 동기화 횟수
    - **Success Rate**: 성공률 (백분율)
    - **Last Sync**: 마지막 동기화 시간
    - **Errors**: 에러 횟수
3. 각 카드의 값이 API 응답과 일치하는지 확인한다.

**기대 결과**:
- [ ] 4개의 통계 카드가 모두 표시된다.
- [ ] Total Syncs = API의 totalSyncs 값
- [ ] Success Rate = (successCount / totalSyncs * 100)% 계산값
- [ ] Last Sync = API의 lastSync 값 (날짜/시간 포맷)
- [ ] Errors = API의 errorCount 값

**참고**:
- Trend 표시 기능은 향후 구현 예정 (현재 미지원)

**Playwright Selector 참고**:
```javascript
// 카드 존재 확인
await expect(page.locator('.stats-card').nth(0)).toContainText('Total Syncs');
await expect(page.locator('.stats-card').nth(1)).toContainText('Success Rate');
await expect(page.locator('.stats-card').nth(2)).toContainText('Last Sync');
await expect(page.locator('.stats-card').nth(3)).toContainText('Errors');

// 값 검증 예시
await expect(page.locator('.stats-card').nth(0).locator('.text-2xl')).toContainText('150');
await expect(page.locator('.stats-card').nth(1).locator('.text-2xl')).toContainText('93%');
```

---

### D-003: Tool 상태 그리드 표시

**우선순위**: P0
**카테고리**: Core

**목적**: 등록된 Tool들의 상태(Active/Inactive/Error)가 그리드 형태로 올바르게 표시되는지 확인

**전제 조건**:
- 다양한 상태(Active, Inactive, Error)를 가진 Tool 데이터 Mocking

**테스트 단계**:
1. 대시보드 페이지 접속
2. ToolStatusGrid 영역 확인
3. 각 Tool 카드의 이름, 버전 표시 확인
4. Status 인디케이터 색상 확인 (Active=Green, Inactive=Gray, Error=Red)
5. 카드 클릭 시 해당 Tool 상세 또는 설정 페이지로 이동 가능한지 확인(링크 존재 여부)

**예상 결과**:
- [ ] 모든 Tool 카드가 그리드 레이아웃으로 표시됨
- [ ] 각 Tool의 상태에 맞는 시각적 스타일이 적용됨

---

### D-004: Activity Feed 표시

**우선순위**: P0
**카테고리**: Core

**목적**: 최근 활동 로그가 최신순으로 표시되는지 확인

**테스트 단계**:
1. 대시보드 페이지 접속
2. 우측 ActivityFeed 사이드바(또는 패널) 확인
3. 활동 목록이 시간 역순(최신이 위)으로 정렬되었는지 확인
4. 각 활동 항목의 아이콘(생성, 수정, 삭제 등) 구분 확인
5. 타임스탬프("2 mins ago" 등) 표시 확인

**예상 결과**:
- [ ] 활동 목록 렌더링 확인
- [ ] 최신 활동이 최상단에 위치
- [ ] 활동 타입에 따른 적절한 아이콘 표시

---

### D-005: 수동 새로고침 동작 확인

**우선순위**: P2
**카테고리**: Feature / UX

**목적**: 페이지 새로고침 또는 네비게이션 시 데이터가 정상적으로 갱신되는지 확인

> **Note**: 자동 폴링은 제거되었습니다. 데이터 갱신은 동기화 완료 후 `invalidateQueries`를 통해 이루어집니다.

**테스트 단계**:
1. 대시보드 페이지 접속 (초기 데이터 로드)
2. 다른 페이지로 이동 후 대시보드 복귀
3. 데이터가 정상적으로 다시 로드되는지 확인
4. 브라우저 새로고침 후 데이터 로드 확인

**예상 결과**:
- [ ] 페이지 네비게이션 후 데이터 정상 로드
- [ ] 브라우저 새로고침 후 데이터 정상 로드

---

### D-006: 에러 상태 처리

**우선순위**: P1
**카테고리**: Error Handling

**목적**: 데이터 로딩 실패 시 UI가 깨지지 않고 에러 메시지를 표시하는지 확인

**전제 조건**:
- 각 컴포넌트는 독립적으로 에러를 처리해야 한다.

**테스트 단계**:
1. `/api/stats` 엔드포인트가 500 에러를 반환하도록 Mock 설정.
2. 대시보드 페이지를 로드한다.
3. StatsCards 섹션에 에러 상태가 표시되는지 확인한다.
4. ActivityFeed, ToolStatusGrid 섹션은 정상 표시되는지 확인한다.
5. (선택) 전체 API 에러 시나리오도 별도 테스트한다.

**기대 결과**:
- [ ] 전체 페이지 크래시가 발생하지 않음
- [ ] 실패한 섹션만 에러 메시지 또는 재시도 버튼을 표시한다.
- [ ] 다른 섹션은 독립적으로 정상 렌더링된다.

**Playwright 구현 참고**:
```javascript
// Stats API만 에러 반환
await page.route('**/api/stats', async route => {
  route.fulfill({
    status: 500,
    body: JSON.stringify({ error: 'Internal Server Error' })
  });
});

// 다른 API는 정상 응답
await page.route('**/api/tools', async route => {
  route.fulfill({ status: 200, body: JSON.stringify([]) });
});

await page.goto('/');

// StatsCards 에러 확인 (구현에 따라 다름)
// 예: null 체크로 인한 미렌더링, 또는 에러 컴포넌트 표시
const statsSection = page.locator('.grid.gap-4.md\\:grid-cols-2.lg\\:grid-cols-4').first();
await expect(statsSection).not.toBeVisible(); // 또는 에러 메시지 확인

// 다른 섹션 정상 확인
await expect(page.locator('text=Tool Status')).toBeVisible();
```

---

### D-007: 빈 데이터 상태 처리

**우선순위**: P2
**카테고리**: Edge Case

**목적**: 데이터가 하나도 없을 때(초기 설치 등)의 UI 확인

**테스트 단계**:
1. 모든 API가 빈 배열 또는 초기값(0)을 반환하도록 설정
2. 대시보드 페이지 접속
3. StatsCards: 모든 수치가 0 또는 "-"로 표시
4. ToolStatusGrid: "No tools found" 또는 안내 메시지 표시
5. ActivityFeed: "No recent activity" 메시지 표시

**예상 결과**:
- [ ] 빈 상태에 대한 안내 UI가 사용자 친화적으로 표시됨
- [ ] 레이아웃이 붕괴되지 않음

---

## 테스트 데이터 Setup

테스트 실행 전 다음 데이터가 준비되어야 합니다:

**Mock 데이터 예시**:
```javascript
// StatsCards Mock 데이터
const mockStats = {
  totalSyncs: 150,
  successCount: 140,
  errorCount: 10,
  lastSync: '2025-12-11T10:00:00Z',
  historyCount: 150
};

// Playwright Mock 설정
await page.route('**/api/stats', async route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify(mockStats)
  });
});

// Tool 데이터
const mockTools = [
  { id: 1, name: 'Linear', status: 'active', version: '1.0.0' },
  { id: 2, name: 'Slack', status: 'error', version: '2.1.0' },
  // ...
];

// Activity 데이터
const mockActivities = [
  { id: 1, type: 'rule_created', message: 'New rule added', timestamp: '2025-12-11T10:00:00Z' },
  // ...
];
```

---

## 테스트 실행 방법

```bash
# Dashboard 테스트만 실행
npm run test:e2e -- --grep "Dashboard"

# 또는 파일 지정 실행
npx playwright test e2e/scenarios/dashboard.spec.ts
```

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-12-11 | 초기 작성 - 7개 시나리오 |
| 1.1 | 2025-12-12 | D-002 StatsCards 실제 구현 반영, Playwright 가이드 추가 |
