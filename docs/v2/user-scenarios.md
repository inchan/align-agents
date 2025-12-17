# 사용자 시나리오 (User Scenarios)

align-agents의 주요 사용 시나리오와 해결하는 문제들입니다.

---

## 시나리오 1: 새 팀원 온보딩

> ⚠️ **현재 제약**: 이 시나리오는 **로컬 환경 기준**입니다. 팀원 간 Rules/MCP 공유는 파일 전달 또는 Git을 통해 수동으로 진행해야 합니다. 클라우드 기반 팀 동기화 기능은 **Phase 2 로드맵**에 포함되어 있습니다.

### 상황
> 새로운 개발자가 팀에 합류했습니다. 팀에서 사용하는 AI 도구(Claude, Cursor, Gemini)의 설정을 빠르게 맞춰야 합니다.

### 기존 방식의 문제
- 각 도구별로 설정 파일 위치를 찾아야 함
- 팀원에게 설정 파일을 받아 수동으로 복사
- 도구마다 형식이 달라 혼란 발생
- 설정 누락 시 코딩 스타일 불일치

### align-agents 사용
```bash
# 1. 도구 설치 후 align-agents 설치 (로컬 빌드)
git clone https://github.com/your-org/align-agents.git
cd align-agents && npm install && npm run build

# 2. 팀 리더로부터 받은 Rules 파일을 로컬에 import (Web UI 사용)
# http://localhost:3001 접속 → Rules → Import

# 3. 가져온 Rules와 MCP 설정 동기화
./packages/cli/bin/acs rules sync --all --source team-standard-rules
./packages/cli/bin/acs sync --all --source team-mcp-set

# 4. 결과 확인
./packages/cli/bin/acs status
```

### 결과
- ✅ 5분 이내에 모든 도구 설정 완료
- ✅ 팀과 동일한 코딩 가이드라인 적용
- ✅ 필요한 MCP 서버 모두 연결

---

## 시나리오 2: 코딩 컨벤션 변경 전파

> ⚠️ **현재 제약**: 이 시나리오는 **로컬 환경 기준**입니다. 팀 리더가 수정한 Rules를 팀원들에게 공유하려면 Git 저장소나 파일 공유를 통해 Rules 파일을 전달해야 합니다. 실시간 팀 동기화는 **Phase 2 로드맵**에 포함되어 있습니다.

### 상황
> 팀 회의에서 새로운 코딩 규칙이 정해졌습니다. "모든 함수에 JSDoc 주석을 추가한다"는 규칙을 모든 팀원의 AI 도구에 즉시 적용해야 합니다.

### 기존 방식의 문제
- 각 팀원이 개별적으로 설정 수정 필요
- 일부 팀원이 업데이트를 놓칠 수 있음
- 도구별로 설정 방식이 달라 실수 발생
- 변경 이력 추적 불가

### align-agents 사용
```bash
# 1. 팀 리더: Web UI에서 Rules 수정
# http://localhost:3001 접속 → Rules → 편집
# - "모든 함수에 JSDoc 주석 추가" 규칙 추가

# 2. 팀 리더: 수정된 Rules 파일을 Git에 커밋하거나 팀원에게 공유
# (현재는 수동 공유, Phase 2에서 클라우드 동기화 예정)

# 3. 각 팀원: 공유받은 Rules를 import 후 동기화 실행
./packages/cli/bin/acs rules sync --all --source team-standard-rules --strategy smart-update
```

### 결과
- ✅ 개인 커스텀 설정은 유지 (Smart Update)
- ✅ 새로운 규칙만 정확히 업데이트
- ✅ 변경 이력이 History에 기록

---

## 시나리오 3: 프로젝트별 다른 설정 적용

### 상황
> 개발자가 두 프로젝트를 동시에 진행 중입니다.
> - **프로젝트 A**: React + TypeScript
> - **프로젝트 B**: Python + Django

### 기존 방식의 문제
- 전역 설정으로는 두 프로젝트 모두 커버 불가
- 프로젝트 전환 시마다 수동 설정 변경
- 실수로 잘못된 설정 적용 가능

### align-agents 사용
```bash
# 프로젝트 A 디렉토리에서
cd ~/projects/react-app
./packages/cli/bin/acs rules sync --all --project . --source react-typescript-rules

# 프로젝트 B 디렉토리에서
cd ~/projects/django-app
./packages/cli/bin/acs rules sync --all --project . --source python-django-rules
```

### 결과
- ✅ 각 프로젝트에 맞는 Rules 자동 적용
- ✅ 프로젝트 전환 시 별도 작업 불필요
- ✅ AI 도구가 현재 프로젝트에 맞는 가이드라인 제공

---

## 시나리오 4: MCP 서버 추가

### 상황
> 새 기능 개발을 위해 PostgreSQL 데이터베이스 조회가 필요합니다. Claude Desktop에서 DB 스키마를 조회하고 싶습니다.

### 기존 방식의 문제
- Claude Desktop의 설정 파일 위치/형식 확인 필요
- 각 도구 문서를 찾아 MCP 설정 방법 확인 필요
- 수동으로 JSON 편집 시 문법 오류 가능

### align-agents 사용
```bash
# 1. Web UI에서 PostgreSQL MCP Definition 추가
# http://localhost:3001 접속 → MCP 페이지

# 2. 원하는 도구에 동기화
./packages/cli/bin/acs sync --tool claude-desktop --source my-mcp-set
```

### 결과
- ✅ 복잡한 JSON 편집 없이 GUI로 설정
- ✅ 선택한 도구에만 정확히 적용
- ✅ 설정 오류 시 자동 백업에서 복원 가능

---

## 시나리오 5: 설정 롤백

### 상황
> 최근 Rules 변경 후 AI 도구의 응답 품질이 떨어졌습니다. 이전 설정으로 빠르게 되돌리고 싶습니다.

### 기존 방식의 문제
- 이전 설정 내용을 기억해야 함
- 백업을 만들어두지 않았다면 복구 불가
- 여러 도구의 설정을 모두 수동으로 되돌려야 함

### align-agents 사용
```bash
# 1. 히스토리 확인
./packages/cli/bin/acs history list --type rules

# 출력 예시:
# ID                     | 날짜       | 설명
# ---------------------- | ---------- | ----------------
# 1733011200-rules      | 2025-12-01 | Rules 업데이트
# 1732924800-rules      | 2025-11-30 | 이전 버전

# 2. 이전 버전으로 복원
./packages/cli/bin/acs history restore 1732924800-rules

# 3. 복원된 Rules 재동기화
./packages/cli/bin/acs rules sync --all
```

### 결과
- ✅ 간단한 명령어로 이전 상태 복원
- ✅ 모든 도구에 일괄 적용
- ✅ 복원 이력도 기록됨

---

## 시나리오 6: 전체 동기화 (일괄 설정)

### 상황
> 새 맥북을 구입했습니다. 이전 환경과 동일하게 모든 AI 도구 설정을 구성하고 싶습니다.

### 기존 방식의 문제
- 이전 맥북의 설정 파일들을 백업해야 함
- 각 도구별로 설정 파일 위치 확인 필요
- 도구 버전 변경 시 설정 형식이 달라질 수 있음

### align-agents 사용
```bash
# 1. 새 맥북에서 align-agents 설치
git clone https://github.com/your-org/align-agents.git
cd align-agents && npm install && npm run build

# 2. 필요한 AI 도구들 설치 후 스캔
./packages/cli/bin/acs scan

# 3. 기존에 백업한 Rules/MCP 데이터 복원 (data.db 복사 또는 Import)

# 4. Rules와 MCP 전체 동기화
./packages/cli/bin/acs rules sync --all --source my-standard-rules --strategy overwrite
./packages/cli/bin/acs sync --all --source my-standard-mcp-set

# 5. 상태 확인
./packages/cli/bin/acs status
```

### 결과
- ✅ 새 환경에서도 동일한 설정 즉시 적용
- ✅ 도구별 설정 형식 차이 자동 처리
- ✅ 이전 환경과 완벽히 동일한 AI 도구 환경

---

## CLI 명령어 요약

### Rules 동기화
```bash
# 전역 Rules 동기화
./packages/cli/bin/acs rules sync --all --source <rule-id>

# 프로젝트 Rules 동기화
./packages/cli/bin/acs rules sync --all --project . --source <rule-id>

# 동기화 전략 지정
./packages/cli/bin/acs rules sync --all --strategy overwrite
./packages/cli/bin/acs rules sync --all --strategy merge
./packages/cli/bin/acs rules sync --all --strategy smart-update
```

### MCP 동기화
```bash
# 특정 도구에 동기화
./packages/cli/bin/acs sync --tool claude-desktop --source <mcp-set-id>

# 모든 도구에 동기화
./packages/cli/bin/acs sync --all --source <mcp-set-id>
```

### 히스토리 관리
```bash
# 히스토리 목록
./packages/cli/bin/acs history list
./packages/cli/bin/acs history list --type rules
./packages/cli/bin/acs history list --type mcp

# 버전 복원
./packages/cli/bin/acs history restore <version-id>
```

### 상태 확인
```bash
# 전체 상태
./packages/cli/bin/acs status

# 설치된 도구 스캔
./packages/cli/bin/acs scan
```

---

## 관련 문서

- [PRD](prd.md) - 제품 요구사항
- [용어 정의](glossary.md) - 용어 설명
- [기능 명세](features.md) - 상세 기능
- [지원 도구](supported-tools.md) - 도구별 상세
