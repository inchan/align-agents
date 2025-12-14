# Sync UI 시나리오 테스트

## 목차

- [개요](#개요)
- [테스트 환경](#테스트-환경)
- [기능 매트릭스](#기능-매트릭스)
- [우선순위 정의](#우선순위-정의)
- [시나리오 목록](#시나리오-목록)
  - [S-001: Sync 페이지 진입 및 초기 상태](#s-001-sync-페이지-진입-및-초기-상태)
  - [S-002: 기본 Tool Set 변경](#s-002-기본-tool-set-변경)
  - [S-003: 커스텀 Tool Set 생성 및 저장](#s-003-커스텀-tool-set-생성-및-저장)
  - [S-003-A: 중복 이름 커스텀 Tool Set 생성 방지](#s-003-a-중복-이름-커스텀-tool-set-생성-방지)
  - [S-004: 커스텀 Tool Set 삭제](#s-004-커스텀-tool-set-삭제)
  - [S-005: Rules 선택 동작](#s-005-rules-선택-동작)
  - [S-006: MCP Set 선택 동작](#s-006-mcp-set-선택-동작)
  - [S-007: 동기화 실행 성공](#s-007-동기화-실행-성공)
  - [S-008: 동기화 실패 및 에러 처리](#s-008-동기화-실패-및-에러-처리)
  - [S-009: 도구 미발견 시 자동 스캔](#s-009-도구-미발견-시-자동-스캔)
- [테스트 데이터 Setup](#테스트-데이터-setup)
- [테스트 실행 방법](#테스트-실행-방법)
- [버전 이력](#버전-이력)

---

## 개요

이 문서는 align-agents의 **Sync 페이지** UI 시나리오 테스트를 정의합니다.
`SyncPage.tsx` 컴포넌트의 Tool Set 관리, Rules/MCP 선택, 동기화 실행 기능을 커버합니다.

> **범위**: Sync 메뉴 내 기능만 다룹니다. Rules/MCP 편집은 별도 문서에서 다룹니다.

---

## 테스트 환경

- **도구**: Playwright
- **대상 페이지**: `/sync`
- **베이스 URL**: http://localhost:5173
- **API 서버**: http://localhost:3001

---

## 기능 매트릭스

| 기능 | 시나리오 번호 | 우선순위 |
|------|---------------|----------|
| 페이지 진입 및 초기 상태 | S-001 | P0 |
| 기본 Tool Set 변경 | S-002 | P0 |
| 커스텀 Tool Set 생성 | S-003 | P0 |
| 커스텀 Tool Set 중복 방지 | S-003-A | P0 |
| 커스텀 Tool Set 삭제 | S-004 | P0 |
| Rules 선택 동작 | S-005 | P0 |
| MCP Set 선택 동작 | S-006 | P0 |
| 동기화 실행 성공 | S-007 | P1 |
| 동기화 실패 처리 | S-008 | P1 |
| 도구 자동 스캔 | S-009 | P2 |

---

## 우선순위 정의

| 우선순위 | 설명 | 릴리즈 기준 |
|----------|------|-------------|
| **P0** | 핵심 기능, 데이터 무결성 | 필수 통과 |
| **P1** | 에러 처리, UX 안전장치 | 권장 통과 |
| **P2** | 부가 기능, 접근성 | 시간 허용 시 |

---

## 시나리오 목록

### S-001: Sync 페이지 진입 및 초기 상태

**우선순위**: P0
**카테고리**: Core

**목적**: Sync 페이지 접속 시 3컬럼 레이아웃이 올바르게 표시되는지 확인

**전제 조건**:
- API 서버 실행 중
- 최소 1개 이상의 Tool 존재

**테스트 단계**:
1. `/sync` 페이지 접속
2. 3개 컬럼 헤더 확인:
   - "Target Tools"
   - "Rules Source"
   - "MCP Server Set"
3. 각 컬럼에 아이템이 표시되는지 확인
4. "All Tools" 기본 Set이 선택되어 있는지 확인

**예상 결과**:
- [ ] 3개 컬럼 레이아웃 정상 렌더링
- [ ] "Target Tools" 컬럼에 기본 Set 목록 표시 (All Tools, CLI Tools, IDEs, Desktop Apps)
- [ ] "Rules Source" 컬럼에 "None" 옵션과 규칙 목록 표시
- [ ] "MCP Server Set" 컬럼에 "None" 옵션과 Set 목록 표시
- [ ] 페이지 로드 시 기본 Tool Set이 선택됨

---

### S-002: 기본 Tool Set 변경

**우선순위**: P0
**카테고리**: Core

**목적**: 기본 Tool Set(All Tools, CLI Tools, IDEs, Desktop Apps) 간 전환이 정상 작동하는지 확인

**전제 조건**:
- 2개 이상의 기본 Tool Set 존재

**테스트 단계**:
1. Sync 페이지 접속
2. "All Tools" Set이 선택되어 있는지 확인 (border-primary 스타일)
3. "CLI Tools" Set 클릭
4. 선택 스타일 변경 확인
5. "IDEs" Set 클릭
6. 선택 스타일 변경 확인

**예상 결과**:
- [ ] 클릭한 Set에 선택 스타일 적용 (border-primary, ring-1 ring-primary/20)
- [ ] 이전 선택된 Set의 선택 스타일 해제
- [ ] Set 변경 시 즉시 UI 업데이트

---

### S-003: 커스텀 Tool Set 생성 및 저장

**우선순위**: P0
**카테고리**: Core

**목적**: 새 커스텀 Tool Set 생성이 정상적으로 작동하고 LocalStorage에 저장되는지 확인

**전제 조건**:
- LocalStorage의 `custom-tool-sets` 키가 초기화된 상태
- 기존 커스텀 Set이 없는 클린 상태

**테스트 단계**:
1. Sync 페이지 접속
2. Target Tools 컬럼의 "+" 버튼 클릭
3. Create Tool Set 다이얼로그 표시 확인
4. 다음 정보 입력:
   - Set Name: `My Test Set`
   - Description: `Test description` (선택)
5. 도구 목록에서 2개 이상 체크박스 선택
6. "Create Set" 버튼 클릭
7. 다이얼로그 닫힘 확인
8. 목록에 새 Set 추가 확인
9. 페이지 새로고침 후 Set 유지 확인

**예상 결과**:
- [ ] 다이얼로그에 이름, 설명, 도구 선택 UI 표시
- [ ] 도구 미선택 시 "Create Set" 버튼 비활성화
- [ ] 이름 미입력 시 "Create Set" 버튼 비활성화
- [ ] 생성 성공 후 목록에 즉시 반영
- [ ] 새로고침 후에도 커스텀 Set 유지 (LocalStorage)

---

### S-003-A: 중복 이름 커스텀 Tool Set 생성 방지

**우선순위**: P0
**카테고리**: Validation

**목적**: 동일한 이름의 커스텀 Tool Set 생성 시 적절히 처리되는지 확인

**전제 조건**:
- "Existing Set"이라는 이름의 커스텀 Set이 이미 존재

**테스트 단계**:
1. Sync 페이지 접속
2. "+" 버튼 클릭하여 Create Tool Set 다이얼로그 열기
3. Set Name에 기존 Set과 동일한 이름 입력: `Existing Set`
4. 도구 1개 이상 선택
5. "Create Set" 버튼 클릭
6. 동작 확인

**예상 결과**:
- [ ] 기존 Set 데이터 덮어쓰기 방지 (데이터 무결성 보장)
- [ ] 동일 이름의 Set이 2개 이상 존재하지 않음

**참고**: 현재 구현에서는 LocalStorage 기반으로 중복 검사가 이루어지며, 테스트에서는 덮어쓰기 방지 여부를 검증합니다.

---

### S-004: 커스텀 Tool Set 삭제

**우선순위**: P0
**카테고리**: Core

**목적**: 커스텀 Tool Set 삭제가 정상적으로 작동하는지 확인

**전제 조건**:
- 삭제 가능한 커스텀 Tool Set 존재

**테스트 단계**:
1. Sync 페이지 접속
2. 커스텀 Set 항목에 마우스 호버
3. 삭제 버튼 (Trash2 아이콘) 표시 확인
4. 삭제 버튼 클릭
5. 확인 다이얼로그 표시 확인
6. "OK" 또는 확인 버튼 클릭
7. 목록에서 Set 제거 확인

**예상 결과**:
- [ ] 커스텀 Set에만 삭제 버튼 표시 (기본 Set에는 없음)
- [ ] 삭제 전 확인 다이얼로그 표시
- [ ] 삭제 후 목록에서 즉시 제거
- [ ] 삭제된 Set이 선택 상태였다면 "All Tools"로 자동 전환

---

### S-005: Rules 선택 동작

**우선순위**: P0
**카테고리**: Core

**목적**: Rules Source 컬럼에서 규칙 선택이 정상 작동하는지 확인

**전제 조건**:
- 1개 이상의 Rule 존재

**테스트 단계**:
1. Sync 페이지 접속
2. Rules Source 컬럼의 "None" 옵션이 기본 선택되어 있는지 확인
3. 특정 Rule 항목 클릭
4. 선택 스타일 변경 확인 (체크 아이콘 표시)
5. "None" 클릭하여 선택 해제
6. 선택 해제 확인

**예상 결과**:
- [ ] 선택된 Rule에 체크 아이콘 표시 (녹색 체크)
- [ ] 단일 선택만 가능 (라디오 버튼 동작)
- [ ] Rule 미리보기 버튼(Eye 아이콘) 클릭 시 상세 Popover 표시
- [ ] "None" 선택 시 규칙 동기화 비활성화

---

### S-006: MCP Set 선택 동작

**우선순위**: P0
**카테고리**: Core

**목적**: MCP Server Set 컬럼에서 Set 선택이 정상 작동하는지 확인

**전제 조건**:
- 1개 이상의 MCP Set 존재

**테스트 단계**:
1. Sync 페이지 접속
2. MCP Server Set 컬럼의 "None" 옵션이 기본 선택되어 있는지 확인
3. 특정 MCP Set 항목 클릭
4. 선택 스타일 변경 확인 (체크 아이콘 표시)
5. "None" 클릭하여 선택 해제
6. 선택 해제 확인

**예상 결과**:
- [ ] 선택된 MCP Set에 체크 아이콘 표시 (녹색 체크)
- [ ] 단일 선택만 가능 (라디오 버튼 동작)
- [ ] MCP Set에 포함된 서버 개수 Badge 표시
- [ ] Set 미리보기 버튼(Eye 아이콘) 클릭 시 서버 목록 Popover 표시
- [ ] "None" 선택 시 MCP 동기화 비활성화

---

### S-007: 동기화 실행 성공

**우선순위**: P1
**카테고리**: Integration
**상태**: `test.skip` (SyncControls 미통합)

**목적**: 선택된 설정으로 동기화가 성공적으로 실행되는지 확인

**전제 조건**:
- Tool Set, Rule, MCP Set 모두 선택 가능
- SyncControls 컴포넌트가 SyncPage에 통합된 경우

**테스트 단계**:
1. Sync 페이지 접속
2. Tool Set 선택 (예: "All Tools")
3. Rule 선택 (None이 아닌 항목)
4. MCP Set 선택 (None이 아닌 항목)
5. 동기화 실행 (SyncControls 또는 관련 버튼)
6. 동기화 진행 상태 확인
7. 완료 후 결과 확인

**예상 결과**:
- [ ] 동기화 중 로딩 인디케이터 표시
- [ ] 성공 시 토스트 메시지 또는 결과 모달 표시
- [ ] 동기화 상태가 UI에 반영됨

**참고**: 현재 SyncPage에는 동기화 실행 버튼이 없으며, SyncDetailPage를 통해 동기화가 실행됩니다. SyncControls가 통합되면 `test.skip`을 해제하세요.

---

### S-008: 동기화 실패 및 에러 처리

**우선순위**: P1
**카테고리**: Error
**상태**: `test.skip` (SyncControls 미통합)

**목적**: 동기화 실패 시 적절한 에러 메시지가 표시되는지 확인

**전제 조건**:
- SyncControls 컴포넌트가 SyncPage에 통합된 경우
- 에러를 유발할 수 있는 테스트 환경 구성

**테스트 단계**:
1. Sync 페이지 접속
2. 유효하지 않은 설정으로 동기화 시도
   (예: 존재하지 않는 도구 경로)
3. 에러 처리 확인

**예상 결과**:
- [ ] 에러 토스트 메시지 표시
- [ ] 에러 상세 정보 확인 가능 (SyncResultModal)
- [ ] 에러 후에도 페이지 정상 동작

**참고**: S-007과 동일하게 SyncControls 통합 후 `test.skip`을 해제하세요.

---

### S-009: 도구 미발견 시 자동 스캔

**우선순위**: P2
**카테고리**: Feature

**목적**: 도구가 없을 때 자동 스캔이 트리거되는지 확인

**전제 조건**:
- API 서버에 등록된 도구가 없는 상태

**테스트 단계**:
1. API 서버의 도구 목록이 비어있는 상태에서 Sync 페이지 접속
2. 자동 스캔 트리거 확인
3. 스캔 완료 후 도구 목록 갱신 확인

**예상 결과**:
- [ ] 도구가 없을 때 자동으로 scanTools 호출
- [ ] 스캔 완료 후 발견된 도구로 Tool Set 갱신
- [ ] 스캔은 한 번만 실행됨 (무한 루프 방지)

---

## 테스트 데이터 Setup

테스트 실행 전 다음 데이터가 준비되어야 합니다:

```
Built-in Tool Set (자동 생성):
- All Tools
- CLI Tools
- IDEs
- Desktop Apps

테스트용 Rules:
- "test-rule-1" (기본 테스트용)
- "test-rule-2" (선택 변경 테스트용)

테스트용 MCP Sets:
- "test-mcp-set" (기본 테스트용)

테스트용 도구:
- cursor (IDE)
- vscode (IDE)
- claude-desktop (Desktop App)
```

**데이터 초기화**:

E2E 테스트는 `beforeEach`에서 자동으로 데이터를 초기화합니다:
- `resetDatabase(request)`: API 서버 DB 초기화
- `cleanupLocalStorage(page)`: 브라우저 LocalStorage 초기화
- `seedToolsData`, `seedRulesData`, `seedMcpData`: 테스트 데이터 시딩

별도의 setup 스크립트 없이 테스트 실행 시 자동 처리됩니다.

---

## 테스트 실행 방법

```bash
# E2E 테스트 실행
cd packages/web
npm run test:e2e

# Sync 관련 테스트만 실행
npm run test:e2e -- --grep "S-00"

# 특정 시나리오만 실행
npm run test:e2e -- --grep "S-003-A"

# 우선순위별 실행
npm run test:e2e -- --grep "P0"

# UI 모드로 실행
npm run test:e2e:ui

# 디버그 모드
npm run test:e2e:debug
```

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-12-13 | 초기 작성 - 10개 시나리오 |
|     |            | - Core: S-001 ~ S-006 (6개) |
|     |            | - Validation: S-003-A (1개) |
|     |            | - Integration: S-007 (1개) |
|     |            | - Error: S-008 (1개) |
|     |            | - Feature: S-009 (1개) |
|     |            | - 우선순위 체계 도입 (P0/P1/P2) |
