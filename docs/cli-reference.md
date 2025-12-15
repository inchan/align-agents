# CLI Command Reference

align-agents의 모든 CLI 명령어에 대한 상세 레퍼런스입니다.

## 전역 옵션

모든 명령어에서 사용 가능한 옵션:

- `--verbose, -v`: 상세 로그 출력
- `--help, -h`: 도움말 표시

---

## `acs init`

초기 설정을 자동으로 수행합니다.

```bash
acs init
```

**동작:**

- `~/.acs` 디렉토리 생성
- SQLite 데이터베이스 (`data.db`) 초기화
- 기본 설정 파일 생성 (레거시 지원용)
- Git 저장소 초기화 (백업용)

---

## `acs ui`

Web UI를 로컬 서버로 실행합니다. (Fastify 기반)

```bash
acs ui [options]
```

**옵션:**

- `--port, -p <number>`: 실행할 포트 번호 (기본값: 3001)
- `--no-open`: 서버 실행 시 브라우저를 자동으로 열지 않음

**예제:**

```bash
# 기본 포트(3001)로 실행 및 브라우저 열기
acs ui

# 4000번 포트로 실행하고 브라우저는 열지 않음
acs ui -p 4000 --no-open
```

---

## `acs scan`

설치된 AI 도구를 스캔하고 Registry를 업데이트합니다.

```bash
acs scan [options]
```

**옵션:**

- `--verbose, -v`: 상세 로그 출력

**예제:**

```bash
acs scan --verbose
```

---

## `acs status`

전체 동기화 상태를 확인합니다.

> **Note**: Master MCP/Rules 상태 표시는 제거되었습니다.

```bash
acs status
```

**출력:**

- 설치된 도구 목록
- 동기화 활성화된 도구 수
- Deprecation 안내

---

## `acs mcp` [DEPRECATED]

> ⚠️ **Deprecated**: Master MCP 개념이 제거되었습니다. Web UI를 사용하여 MCP Sets를 관리하세요.

```bash
acs mcp
```

**출력:**

Deprecation 메시지와 Web UI 사용 안내

---

## `acs sync`

MCP 설정을 각 도구에 동기화합니다.

```bash
acs sync [options]
```

**옵션:**

- `--source <id>`: 동기화할 MCP Set ID (생략 시 대화형 선택)
- `--tool <id>`: 특정 도구에만 동기화
- `--all`: 모든 도구에 동기화
- `--strategy <strategy>`: 동기화 전략 선택
  - `overwrite`: 기존 내용 덮어쓰기
  - `merge`: 내용 병합
  - `smart-update`: 마커 기반 스마트 업데이트 (기본값)
- `--verbose, -v`: 상세 로그 출력

**예제:**

```bash
# Claude Desktop에 동기화
acs sync --tool claude-desktop

# 모든 도구에 동기화 (MCP Set ID 지정 및 덮어쓰기)
acs sync --all --source <set-id> --strategy overwrite

# 상세 로그와 함께 동기화
acs sync --tool claude-desktop --verbose
```

---

## `acs rules`

Rules를 관리하고 동기화합니다.

> **Note**: `show`, `edit`, `template` 명령어는 제거되었습니다. Web UI를 사용하세요.

### `acs rules sync`

Rules를 도구에 동기화합니다.

```bash
acs rules sync [options]
```

**옵션:**

- `--source <id>`: 동기화할 Rule ID (생략 시 대화형 선택)
- `--tool <id>`: 특정 도구에만 동기화
- `--all`: 모든 도구에 동기화
- `--project <path>`: 프로젝트 경로 (기본값: 현재 디렉토리)
- `--global`: 전역 Rules 사용
- `--strategy <strategy>`: 동기화 전략
  - `overwrite`: 기존 내용 덮어쓰기
  - `merge`: 내용 병합
  - `smart-update`: 마커 기반 스마트 업데이트 (기본값)
- `--verbose, -v`: 상세 로그 출력

**예제:**

```bash
# Claude Code CLI에 프로젝트 Rules 동기화
acs rules sync --tool claude-code --project /path/to/project

# 모든 도구에 전역 Rules 동기화 (Rule ID 지정)
acs rules sync --all --global --source <rule-id>

# 모든 도구에 전역 Rules 동기화 (대화형 선택)
acs rules sync --all --global

# Smart Update 전략으로 동기화
acs rules sync --all --strategy smart-update --verbose
```

---

## `acs backup`

설정을 Git으로 백업하고 복원합니다.

### `acs backup create`

현재 설정의 백업을 생성합니다.

```bash
acs backup create [message]
```

**인자:**

- `[message]`: 백업 메시지 (선택 사항)

**예제:**

```bash
acs backup create "Added new MCP servers"
```

### `acs backup list`

백업 목록을 표시합니다.

```bash
acs backup list
```

**출력:**

- 커밋 해시
- 백업 메시지
- 생성 시간

### `acs backup restore`

특정 백업으로 복원합니다.

```bash
acs backup restore <hash>
```

**인자:**

- `<hash>`: 복원할 커밋 해시

**예제:**

```bash
acs backup restore abc1234
```

---

## `acs history`

설정 변경 히스토리를 관리합니다.

### `acs history list`

변경 히스토리를 표시합니다.

```bash
acs history list [options]
```

**옵션:**

- `--limit <n>`: 표시할 항목 수 (기본값: 10)

### `acs history restore` [DEPRECATED]

> ⚠️ **Deprecated**: Master 개념 제거로 인해 비활성화되었습니다.

```bash
acs history restore <version-id>
```

**출력:**

Deprecation 메시지와 대안 안내

---

## `acs validate`

설정 파일의 유효성을 검증합니다.

```bash
acs validate [options]
```

**옵션:**

- `--mcp`: MCP 설정만 검증
- `--rules`: Rules 설정만 검증
- `--config`: 전역 설정만 검증

**예제:**

```bash
# 모든 설정 검증
acs validate

# MCP 설정만 검증
acs validate --mcp
```

---

## `acs config`

전역 설정을 관리합니다.

### `acs config show`

현재 전역 설정을 표시합니다.

```bash
acs config show
```

### `acs config edit`

기본 에디터로 전역 설정을 편집합니다.

```bash
acs config edit
```

---

## 환경 변수

- `EDITOR`: 기본 텍스트 에디터 (기본값: `vi`)
- `AI_CLI_SYNCER_CONFIG_DIR`: 설정 디렉토리 경로 (기본값: `~/.acs`)

---

## 종료 코드

- `0`: 성공
- `1`: 일반 오류
- `2`: 설정 파일 오류
- `3`: 동기화 실패

---

## 예제 워크플로우

### 1. 초기 설정 및 동기화

```bash
# 초기화
acs init

# Web UI에서 MCP Set 생성 및 서버 추가
# http://localhost:5173 접속

# Claude Desktop에 동기화 (대화형 선택)
acs sync --tool claude-desktop

# 백업 생성
acs backup create "Initial MCP setup"
```

### 2. Rules 동기화

```bash
# Web UI에서 Rule 생성 및 편집
# http://localhost:5173 접속 → Rules 페이지

# 모든 도구에 전역 Rules 동기화 (대화형 선택)
acs rules sync --all --global

# 또는 Rule ID 지정
acs rules sync --all --global --source <rule-id>

# 백업 생성
acs backup create "Applied custom rules"
```

### 3. 백업 및 복원

```bash
# 현재 상태 백업
acs backup create "Before major changes"

# Web UI에서 설정 변경...

# 백업 목록 확인
acs backup list

# 이전 상태로 복원
acs backup restore abc1234
```
