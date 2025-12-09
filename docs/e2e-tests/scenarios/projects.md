# Projects UI 시나리오 테스트

## 목차

- [개요](#개요)
- [테스트 환경](#테스트-환경)
- [기능 매트릭스](#기능-매트릭스)
- [우선순위 정의](#우선순위-정의)
- [시나리오 목록](#시나리오-목록)
  - [P-001: Projects 목록 조회](#p-001-projects-목록-조회)
  - [P-002: Global Settings 기본 선택](#p-002-global-settings-기본-선택)
  - [P-003: Project 선택 및 상세 보기](#p-003-project-선택-및-상세-보기)
  - [P-004: Project 생성 - 모달 열기/닫기](#p-004-project-생성---모달-열기닫기)
  - [P-005: Project 생성 - 성공 케이스](#p-005-project-생성---성공-케이스)
  - [P-006: Project 생성 - Browse 버튼으로 폴더 선택](#p-006-project-생성---browse-버튼으로-폴더-선택)
  - [P-007: Project 편집 - 모달 열기](#p-007-project-편집---모달-열기)
  - [P-008: Project 편집 - 저장 성공](#p-008-project-편집---저장-성공)
  - [P-009: Project 삭제 - 확인 다이얼로그](#p-009-project-삭제---확인-다이얼로그)
  - [P-010: Project 삭제 - 성공 케이스](#p-010-project-삭제---성공-케이스)
  - [P-011: Project 스캔 기능](#p-011-project-스캔-기능)
  - [P-012: 검색 필터링](#p-012-검색-필터링)
- [유효성 검증 시나리오](#유효성-검증-시나리오)
  - [P-013: 필수 필드 누락 검증](#p-013-필수-필드-누락-검증)
  - [P-014: 잘못된 경로 입력](#p-014-잘못된-경로-입력)
- [에러 처리 시나리오](#에러-처리-시나리오)
  - [P-015: Project 생성 실패](#p-015-project-생성-실패)
  - [P-016: Project 스캔 실패](#p-016-project-스캔-실패)
- [엣지 케이스 시나리오](#엣지-케이스-시나리오)
  - [P-017: 긴 Project 이름 처리](#p-017-긴-project-이름-처리)
  - [P-018: 빈 상태 - Project 미선택](#p-018-빈-상태---project-미선택)
  - [P-019: 선택된 Project 삭제 후 상태](#p-019-선택된-project-삭제-후-상태)
  - [P-020: 검색 결과 없음](#p-020-검색-결과-없음)
  - [P-021: Project 상세 - Tools 미감지](#p-021-project-상세---tools-미감지)
- [접근성 시나리오](#접근성-시나리오)
  - [P-022: 키보드 네비게이션](#p-022-키보드-네비게이션)
  - [P-023: 긴 경로 Tooltip 확인](#p-023-긴-경로-tooltip-확인)
- [테스트 데이터 Setup](#테스트-데이터-setup)
- [테스트 실행 방법](#테스트-실행-방법)
- [버전 이력](#버전-이력)

---

## 개요

이 문서는 AI CLI Syncer의 **Projects 관리 페이지** UI 시나리오 테스트를 정의합니다.
`ProjectsPage.tsx` 컴포넌트의 모든 기능을 커버합니다.

**주요 기능:**
- Project CRUD (Create, Read, Update, Delete)
- Global Settings 뷰
- Project 스캔 (자동 감지)
- 검색 필터링
- Tool 감지 상세 정보

---

## 테스트 환경

- **도구**: Playwright
- **대상 페이지**: `/projects`
- **베이스 URL**: http://localhost:5173
- **API 서버**: http://localhost:3001

---

## 기능 매트릭스

| 기능 | 시나리오 번호 | 우선순위 |
|------|---------------|----------|
| Project 목록 조회 | P-001 | P0 |
| Global Settings 뷰 | P-002 | P0 |
| Project 선택 및 상세 | P-003 | P0 |
| Project 생성 | P-004, P-005, P-006 | P0 |
| Project 편집 | P-007, P-008 | P0 |
| Project 삭제 | P-009, P-010 | P0 |
| Project 스캔 | P-011 | P1 |
| 검색 필터링 | P-012 | P1 |
| 유효성 검증 | P-013, P-014 | P0 |
| 에러 처리 | P-015, P-016 | P1 |
| 엣지 케이스 | P-017, P-018, P-019, P-020, P-021 | P1-P2 |
| 접근성 | P-022, P-023 | P2 |

---

## 우선순위 정의

| 우선순위 | 설명 | 릴리즈 기준 |
|----------|------|-------------|
| **P0** | 핵심 기능, 데이터 무결성 | 필수 통과 |
| **P1** | 에러 처리, UX 안전장치 | 권장 통과 |
| **P2** | 부가 기능, 접근성 | 시간 허용 시 |

---

## 시나리오 목록

### P-001: Projects 목록 조회

**우선순위**: P0
**카테고리**: Core

**목적**: Projects 페이지 접속 시 Project 목록이 올바르게 표시되는지 확인

**전제 조건**:
- API 서버 실행 중
- 최소 1개 이상의 Project가 존재

**테스트 단계**:
1. `/projects` 페이지 접속
2. 좌측 패널에 "Projects" 헤더(Briefcase 아이콘) 확인
3. "Global Settings" 항목이 상단에 표시되는지 확인
4. Separator 아래 Project 목록이 표시되는지 확인
5. 각 Project 항목에 이름, 경로(마지막 폴더명) 표시 확인
6. Source 아이콘(cursor/vscode/windsurf) 표시 확인

**예상 결과**:
- [ ] Project 목록이 좌측 패널에 표시됨
- [ ] Global Settings가 목록 상단에 위치
- [ ] 각 항목에 이름, 경로, source 아이콘이 표시됨
- [ ] Scan(RefreshCw) 버튼과 Add(+) 버튼이 헤더에 표시됨

---

### P-002: Global Settings 기본 선택

**우선순위**: P0
**카테고리**: Core

**목적**: 페이지 로드 시 Global Settings가 기본 선택되는지 확인

**테스트 단계**:
1. `/projects` 페이지 접속
2. 좌측 목록에서 "Global Settings" 항목 확인
3. 선택 상태(border-primary, ring-primary 스타일) 확인
4. 우측 패널에 "Global Configuration" 제목 표시 확인
5. Tool 메타데이터 테이블이 표시되는지 확인

**예상 결과**:
- [ ] Global Settings가 기본 선택됨
- [ ] 우측에 Global Configuration 정보 표시
- [ ] Tool별 Global Rules/MCP 경로 테이블 표시

---

### P-003: Project 선택 및 상세 보기

**우선순위**: P0
**카테고리**: Core

**목적**: Project 항목 클릭 시 우측에 상세 정보가 표시되는지 확인

**전제 조건**:
- 최소 1개 이상의 Project가 존재

**테스트 단계**:
1. Projects 페이지 접속
2. Project 항목 클릭
3. 선택된 Project가 하이라이트되는지 확인 (border-primary 스타일)
4. 우측 패널에 Project 이름과 경로 표시 확인
5. "Edit Project" 버튼 표시 확인
6. Tool 감지 테이블에 감지된 도구들 표시 확인

**예상 결과**:
- [ ] 선택된 Project가 하이라이트됨
- [ ] 우측에 Project 상세 정보 표시
- [ ] 감지된 Tool과 파일 경로 표시

---

### P-004: Project 생성 - 모달 열기/닫기

**우선순위**: P0
**카테고리**: Core

**목적**: Project 생성 모달의 기본 동작 확인

**테스트 단계**:
1. Projects 페이지 접속
2. 좌측 패널 헤더의 "+" 버튼 클릭
3. "Add Project" 모달이 표시되는지 확인
4. 모달에 "Project Path", "Project Name" 입력 필드 확인
5. "Browse" 버튼 표시 확인
6. "Cancel" 버튼 클릭
7. 모달이 닫히는지 확인

**예상 결과**:
- [ ] "+" 버튼 클릭 시 모달 표시
- [ ] 모달에 필수 입력 필드와 Browse 버튼 존재
- [ ] Cancel 클릭 시 모달 닫힘

---

### P-005: Project 생성 - 성공 케이스

**우선순위**: P0
**카테고리**: Core

**목적**: 새 Project 생성이 정상적으로 작동하는지 확인

**테스트 단계**:
1. Projects 페이지 접속
2. "+" 버튼 클릭하여 모달 열기
3. Project Path 입력: `/Users/test/my-project`
4. Project Name 입력: `Test Project`
5. "Add Project" 버튼 클릭
6. 토스트 메시지 확인: "Project created successfully"
7. 모달이 닫히는지 확인
8. 좌측 목록에 새 Project가 추가되는지 확인
9. 새 Project가 자동으로 선택되는지 확인

**예상 결과**:
- [ ] Project 생성 성공
- [ ] 토스트 메시지 표시
- [ ] 목록에 새 Project 추가
- [ ] 생성된 Project가 자동 선택됨

---

### P-006: Project 생성 - Browse 버튼으로 폴더 선택

**우선순위**: P1
**카테고리**: Core

**목적**: Browse 버튼을 통한 폴더 선택 기능 확인

**테스트 단계**:
1. "+" 버튼 클릭하여 모달 열기
2. "Browse" 버튼 클릭
3. OS 폴더 선택 다이얼로그 표시 확인
4. 폴더 선택 후 Path 필드에 경로 자동 입력 확인
5. Name 필드가 비어있었다면 폴더명으로 자동 채워지는지 확인

**예상 결과**:
- [ ] Browse 클릭 시 폴더 선택 다이얼로그 표시
- [ ] 선택한 경로가 Path 필드에 입력됨
- [ ] 빈 Name 필드에 폴더명 자동 채움

**참고**: OS 레벨 다이얼로그는 Playwright에서 직접 제어 불가 - API Mock 또는 실제 환경 테스트 필요

---

### P-007: Project 편집 - 모달 열기

**우선순위**: P0
**카테고리**: Core

**목적**: Project 편집 모달이 정상적으로 열리는지 확인

**전제 조건**:
- 최소 1개의 Project가 존재

**테스트 단계**:
1. Projects 페이지 접속
2. Project 항목에 마우스 호버
3. 우측에 MoreVertical(점 3개) 버튼이 나타나는지 확인
4. 드롭다운 메뉴 클릭
5. "Edit" 메뉴 아이템 클릭
6. "Edit Project" 모달이 표시되는지 확인
7. 기존 이름과 경로가 입력 필드에 채워져 있는지 확인

**대안 경로**:
1. Project 선택 후 우측 패널의 "Edit Project" 버튼 클릭
2. 동일하게 편집 모달 표시 확인

**예상 결과**:
- [ ] 드롭다운에서 Edit 클릭 시 모달 표시
- [ ] 상세 패널의 Edit Project 버튼 클릭 시 모달 표시
- [ ] 기존 값이 입력 필드에 로드됨

---

### P-008: Project 편집 - 저장 성공

**우선순위**: P0
**카테고리**: Core

**목적**: Project 편집 후 저장이 정상 작동하는지 확인

**테스트 단계**:
1. P-007 단계 수행하여 편집 모달 열기
2. Project Name 수정: 기존 이름 + " (Updated)"
3. "Save Changes" 버튼 클릭
4. 토스트 메시지 확인: "Project updated successfully"
5. 모달이 닫히는지 확인
6. 좌측 목록에 변경된 이름이 반영되는지 확인

**예상 결과**:
- [ ] 저장 성공 토스트 표시
- [ ] 모달 닫힘
- [ ] 변경 사항이 UI에 반영됨

---

### P-009: Project 삭제 - 확인 다이얼로그

**우선순위**: P0
**카테고리**: Core

**목적**: Project 삭제 시 확인 다이얼로그가 표시되는지 확인

**전제 조건**:
- 최소 1개의 Project가 존재

**테스트 단계**:
1. Projects 페이지 접속
2. Project 항목에 마우스 호버
3. 드롭다운 메뉴 클릭
4. "Delete" 메뉴 아이템 클릭
5. 브라우저 confirm 다이얼로그 표시 확인: "Are you sure?"
6. "Cancel" 클릭
7. Project가 삭제되지 않았는지 확인

**예상 결과**:
- [ ] 드롭다운에서 Delete 클릭 시 confirm 표시
- [ ] Cancel 시 삭제 취소

**참고**: 현재 구현은 `window.confirm()` 사용 - 향후 커스텀 Dialog로 개선 권장

---

### P-010: Project 삭제 - 성공 케이스

**우선순위**: P0
**카테고리**: Core

**목적**: Project 삭제가 정상적으로 작동하는지 확인

**전제 조건**:
- 삭제 가능한 테스트용 Project 존재

**테스트 단계**:
1. 삭제할 Project의 드롭다운 메뉴 열기
2. "Delete" 클릭
3. confirm 다이얼로그에서 "OK" 클릭
4. 토스트 메시지 확인: "Project deleted"
5. 좌측 목록에서 Project가 제거되는지 확인

**예상 결과**:
- [ ] 삭제 성공 토스트 표시
- [ ] 목록에서 Project 제거

---

### P-011: Project 스캔 기능

**우선순위**: P1
**카테고리**: Feature

**목적**: Project 스캔 기능이 정상적으로 작동하는지 확인

**테스트 단계**:
1. Projects 페이지 접속
2. 좌측 패널 헤더의 Scan(RefreshCw) 버튼 클릭
3. 버튼 아이콘이 회전 애니메이션 표시 확인 (animate-spin)
4. 스캔 완료 후 토스트 메시지 확인: "Scan complete. Found X projects."
5. 새로 감지된 Project가 목록에 추가되는지 확인

**예상 결과**:
- [ ] 스캔 중 로딩 표시 (회전 아이콘)
- [ ] 스캔 완료 토스트 표시
- [ ] 감지된 프로젝트 수 표시
- [ ] 목록 업데이트

---

### P-012: 검색 필터링

**우선순위**: P1
**카테고리**: Feature

**목적**: 검색 기능으로 Project 목록 필터링이 작동하는지 확인

**전제 조건**:
- 최소 3개 이상의 서로 다른 이름의 Project 존재

**테스트 단계**:
1. Projects 페이지 접속
2. 검색 입력 필드에 특정 Project 이름 일부 입력
3. 입력한 텍스트가 포함된 Project만 표시되는지 확인
4. 검색어 삭제
5. 전체 목록이 다시 표시되는지 확인
6. 경로로 검색 테스트: 특정 경로 일부 입력
7. 해당 경로를 가진 Project만 표시되는지 확인

**예상 결과**:
- [ ] 이름으로 필터링 작동
- [ ] 경로로 필터링 작동
- [ ] 검색어 삭제 시 전체 목록 복원
- [ ] Global Settings는 필터링에서 제외 (항상 표시)

---

## 유효성 검증 시나리오

### P-013: 필수 필드 누락 검증

**우선순위**: P0
**카테고리**: Validation

**목적**: 필수 필드 없이 Project 생성 시도 시 검증 확인

**테스트 단계**:
1. 생성 모달 열기
2. Path 필드 비워두기
3. Name만 입력
4. "Add Project" 버튼 상태 확인

**테스트 변형**:
- Name만 비워둔 경우도 테스트

**예상 결과**:
- [ ] Path가 비어있으면 "Add Project" 버튼이 비활성화됨
- [ ] 클릭 시 토스트 에러: "Name and Path are required"

---

### P-014: 잘못된 경로 입력

**우선순위**: P1
**카테고리**: Validation

**목적**: 존재하지 않는 경로 입력 시 처리 확인

**테스트 단계**:
1. 생성 모달 열기
2. 존재하지 않는 경로 입력: `/invalid/path/does/not/exist`
3. Name 입력
4. "Add Project" 버튼 클릭
5. 서버 응답 확인

**예상 결과**:
- [ ] 서버가 경로 유효성 검증 수행 (구현에 따라)
- [ ] 에러 메시지 표시 또는 생성 성공 (비즈니스 로직에 따라)

---

## 에러 처리 시나리오

### P-015: Project 생성 실패

**우선순위**: P1
**카테고리**: Error

**목적**: Project 생성 실패 시 에러 메시지가 표시되는지 확인

**테스트 단계**:
1. API 서버 중지 또는 네트워크 차단
2. 생성 모달에서 유효한 데이터 입력
3. "Add Project" 버튼 클릭
4. 에러 토스트 메시지 확인: "Failed to create: ..."

**예상 결과**:
- [ ] 에러 토스트 메시지 표시
- [ ] 모달 유지 (재시도 가능)
- [ ] 입력한 데이터 유지

---

### P-016: Project 스캔 실패

**우선순위**: P1
**카테고리**: Error

**목적**: Project 스캔 실패 시 에러 메시지가 표시되는지 확인

**테스트 단계**:
1. API 서버 중지 또는 네트워크 차단
2. Scan 버튼 클릭
3. 에러 토스트 메시지 확인: "Scan failed: ..."

**예상 결과**:
- [ ] 에러 토스트 메시지 표시
- [ ] 기존 목록 유지

---

## 엣지 케이스 시나리오

### P-017: 긴 Project 이름 처리

**우선순위**: P2
**카테고리**: Edge

**목적**: 긴 이름이 UI에서 올바르게 처리되는지 확인

**테스트 단계**:
1. 50자 이상의 긴 이름으로 Project 생성
2. 좌측 목록에서 표시 확인
3. 우측 상세 패널 헤더에서 표시 확인

**예상 결과**:
- [ ] 좌측 목록: truncate 스타일로 말줄임 처리 (...)
- [ ] 레이아웃 깨짐 없음

---

### P-018: 빈 상태 - Project 미선택

**우선순위**: P1
**카테고리**: Edge

**목적**: Project가 선택되지 않았을 때 적절한 안내가 표시되는지 확인

**테스트 단계**:
1. Global Settings도 Project도 선택되지 않은 상태 유도 (구현상 불가능할 수 있음)
2. 우측 패널 확인

**예상 결과**:
- [ ] "No Project Selected" 메시지 표시
- [ ] FolderOpen 아이콘과 함께 안내 UI 표시
- [ ] "Select a project from the list or create a new one to get started." 메시지

**참고**: 현재 구현에서는 'global'이 기본 선택되므로 이 상태 도달이 어려움

---

### P-019: 선택된 Project 삭제 후 상태

**우선순위**: P0
**카테고리**: Edge

**목적**: 현재 선택된 Project 삭제 시 선택 상태 처리 확인

**전제 조건**:
- 최소 1개의 Project 존재

**테스트 단계**:
1. Project 선택 (Global Settings 아닌 것)
2. 해당 Project 삭제
3. 선택 상태 확인

**예상 결과**:
- [ ] 삭제 후 Global Settings가 자동 선택됨
- [ ] 우측 패널이 Global Configuration으로 전환됨

---

### P-020: 검색 결과 없음

**우선순위**: P2
**카테고리**: Edge

**목적**: 검색 결과가 없을 때 UI 처리 확인

**테스트 단계**:
1. 검색 필드에 존재하지 않는 텍스트 입력: `zzzznonexistent`
2. 목록 영역 확인

**예상 결과**:
- [ ] Project 목록이 비어있음
- [ ] Global Settings는 계속 표시됨 (필터 대상 아님)
- [ ] 빈 상태 메시지 표시 (선택적)

---

### P-021: Project 상세 - Tools 미감지

**우선순위**: P1
**카테고리**: Edge

**목적**: Project에서 Tool이 감지되지 않았을 때 UI 처리 확인

**전제 조건**:
- AI 도구 설정 파일이 없는 프로젝트

**테스트 단계**:
1. Tool 설정 파일이 없는 Project 선택
2. 우측 상세 패널의 Tool 테이블 확인

**예상 결과**:
- [ ] "No Tools Detected" EmptyState 표시
- [ ] Box 아이콘과 함께 안내 메시지 표시
- [ ] "We couldn't find any supported AI tools in this project." 메시지

---

## 접근성 시나리오

### P-022: 키보드 네비게이션

**우선순위**: P2
**카테고리**: Accessibility

**목적**: 키보드만으로 주요 기능 사용 가능 여부 확인

**테스트 단계**:
1. Projects 페이지 접속
2. Tab 키로 검색 필드, Scan 버튼, Add 버튼 순서로 포커스 이동
3. Tab으로 Project 목록 탐색
4. Enter 키로 Project 선택
5. Tab으로 드롭다운 메뉴 접근
6. Enter로 드롭다운 열기
7. Arrow 키로 메뉴 아이템 탐색
8. Enter로 선택

**예상 결과**:
- [ ] Tab으로 요소 간 이동 가능
- [ ] Enter로 선택/실행 가능
- [ ] Esc로 모달/드롭다운 닫기 가능
- [ ] 포커스 표시가 시각적으로 명확함

---

### P-023: 긴 경로 Tooltip 확인

**우선순위**: P2
**카테고리**: Accessibility

**목적**: 말줄임 처리된 긴 경로의 전체 내용을 Tooltip으로 확인 가능한지 검증

**전제 조건**:
- 긴 경로를 가진 Project 존재

**테스트 단계**:
1. 좌측 목록에서 긴 경로 Project 항목의 경로 부분에 마우스 호버
2. `title` 속성 또는 Tooltip 표시 여부 확인
3. 전체 경로가 표시되는지 확인

**예상 결과**:
- [ ] 호버 시 전체 경로 확인 가능
- [ ] `title` 속성에 전체 경로 포함

---

## 테스트 데이터 Setup

테스트 실행 전 다음 데이터가 준비되어야 합니다:

```
테스트용 Project 3개 사전 생성:
- "Test Project A" (path: /Users/test/project-a, source: vscode)
- "Test Project B" (path: /Users/test/project-b, source: cursor)
- "Test Project C" (path: /Users/test/project-c, source: windsurf)

Tool 감지 테스트를 위한 프로젝트:
- AI 도구 설정 파일이 있는 프로젝트
- AI 도구 설정 파일이 없는 프로젝트
```

**Setup 스크립트 예시**:
```bash
# 테스트 데이터 초기화
npm run test:setup

# E2E 테스트 실행
npm run test:e2e
```

---

## 테스트 실행 방법

```bash
# E2E 테스트 실행
cd packages/web
npm run test:e2e

# 특정 시나리오만 실행
npm run test:e2e -- --grep "P-001"

# 우선순위별 실행
npm run test:e2e -- --grep "P0"

# UI 모드로 실행
npm run test:e2e:ui
```

---

## 버전 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-12-08 | 초기 작성 - 23개 시나리오 |
|     |            | - Core CRUD 시나리오 (P-001 ~ P-010) |
|     |            | - 스캔/검색 기능 (P-011, P-012) |
|     |            | - 유효성 검증 (P-013, P-014) |
|     |            | - 에러 처리 (P-015, P-016) |
|     |            | - 엣지 케이스 (P-017 ~ P-021) |
|     |            | - 접근성 (P-022, P-023) |
|     |            | - 우선순위 체계 도입 (P0/P1/P2) |
