# CLI Command Reference

AI CLI Syncer의 모든 CLI 명령어에 대한 상세 레퍼런스입니다.

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

- `~/.ai-cli-syncer` 디렉토리 생성
- 기본 설정 파일 생성 (`master-mcp.json`, `master-rules.md`, `config.json`)
- Git 저장소 초기화 (백업용)

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

```bash
acs status
```

**출력:**

- 설치된 도구 목록
- 각 도구의 동기화 상태
- 마지막 동기화 시간

---

## `acs mcp`

마스터 MCP 서버를 관리합니다.

### `acs mcp add`

MCP 서버를 추가합니다.

```bash
acs mcp add <name> --command <cmd> --args <arg1> [arg2...] [options]
```

**인자:**

- `<name>`: 서버 이름 (고유 식별자)
- `--command <cmd>`: 실행 명령어 (예: `npx`, `node`)
- `--args <arg1> [arg2...]`: 명령어 인자

**옵션:**

- `--env <KEY=VALUE>`: 환경 변수 설정 (여러 번 사용 가능)
- `--description <desc>`: 서버 설명
- `--category <cat>`: 서버 카테고리

**예제:**

```bash
# Filesystem MCP 서버 추가
acs mcp add filesystem \
  --command npx \
  --args "-y @modelcontextprotocol/server-filesystem /Users/username/Documents"

# Brave Search MCP 서버 추가 (환경 변수 포함)
acs mcp add brave-search \
  --command npx \
  --args "-y @modelcontextprotocol/server-brave-search" \
  --env BRAVE_API_KEY=your_api_key
```

### `acs mcp list`

등록된 MCP 서버 목록을 표시합니다.

```bash
acs mcp list
```

### `acs mcp remove`

MCP 서버를 삭제합니다.

```bash
acs mcp remove <name>
```

**인자:**

- `<name>`: 삭제할 서버 이름

**예제:**

```bash
acs mcp remove filesystem
```

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
Stateless 방식을 통해 선택적으로 Rules를 배포합니다.

### `acs rules show`

Rules 목록을 표시합니다.
 
 ### `acs rules show`
 
 상세 Rules 내용을 표시합니다.

```bash
acs rules show
```

### `acs rules edit`

기본 에디터로 Rule을 편집하거나 생성합니다.

```bash
acs rules edit
```

**동작:**

- `$EDITOR` 환경 변수에 설정된 에디터 사용
- 에디터가 설정되지 않은 경우 `vi` 사용

### `acs rules template list`

사용 가능한 템플릿 목록을 표시합니다.

```bash
acs rules template list
```

### `acs rules template apply`

템플릿을 기반으로 새로운 Rule을 생성합니다.

```bash
acs rules template apply <template-name>
```

**인자:**

- `<template-name>`: 적용할 템플릿 이름

**예제:**

```bash
acs rules template apply react
```

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

### `acs history restore`

특정 버전으로 롤백합니다.

```bash
acs history restore <version-id>
```

**인자:**

- `<version-id>`: 복원할 버전 ID

**예제:**

```bash
acs history restore v1.2.3
```

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
- `AI_CLI_SYNCER_CONFIG_DIR`: 설정 디렉토리 경로 (기본값: `~/.ai-cli-syncer`)

---

## 종료 코드

- `0`: 성공
- `1`: 일반 오류
- `2`: 설정 파일 오류
- `3`: 동기화 실패

---

## 예제 워크플로우

### 1. 초기 설정 및 MCP 서버 추가

```bash
# 초기화
acs init

# MCP 서버 추가
acs mcp add filesystem --command npx --args "-y @modelcontextprotocol/server-filesystem /Users/username/Documents"

# Claude Desktop에 동기화
acs sync --tool claude-desktop

# 백업 생성
acs backup create "Initial MCP setup"
```

### 2. Rules 템플릿 적용 및 동기화

```bash
# React 템플릿 적용
acs rules template apply react

# Rules 편집
acs rules edit

# 모든 도구에 동기화
acs rules sync --all --project /path/to/my-project

# 백업 생성
acs backup create "Applied React rules"
```

### 3. 백업 및 복원

```bash
# 현재 상태 백업
acs backup create "Before major changes"

# 설정 변경...
acs mcp add new-server --command node --args server.js

# 백업 목록 확인
acs backup list

# 이전 상태로 복원
acs backup restore abc1234
```
