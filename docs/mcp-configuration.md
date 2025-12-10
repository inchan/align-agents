# MCP Configuration Reference

MCP(Model Context Protocol) 설정에 대한 도구별 공식 경로 및 구조 레퍼런스입니다.

> **Last Updated**: 2025-12-07
> **Sources**: 각 도구의 공식 문서 및 CLI 실행 결과 기반

---

## 조사 방법론

이 문서의 정보는 다음 방법으로 수집/검증되었습니다:

### 1. 공식 문서 조사

| 도구 | 공식 문서 URL |
|------|--------------|
| Claude Desktop | https://support.claude.com/en/articles/10949351 |
| Claude Code | https://code.claude.com/docs/en/mcp |
| Cursor | https://snyk.io/articles/how-to-add-a-new-mcp-server-to-cursor/ |
| Windsurf | https://docs.windsurf.com/windsurf/cascade/mcp |
| Codex | https://developers.openai.com/codex/mcp/ |
| Gemini | https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html |

### 2. CLI 명령어 탐색

각 도구의 MCP 지원 여부는 터미널에서 직접 확인:

```bash
# 도구별 MCP 명령어 확인
claude mcp --help
codex mcp --help
gemini mcp --help
qwen mcp --help

# MCP 서버 목록 확인
<tool> mcp list

# 테스트 서버 추가 후 설정 파일 확인
<tool> mcp add test-server npx -y @test/mcp --scope user
cat ~/.도구/settings.json
```

### 3. 설정 파일 구조 검증

실제 MCP 서버 추가 후 생성된 설정 파일을 분석:

```bash
# Qwen 예시 - 전역 설정
qwen mcp add test npx -y @test/mcp --scope user
cat ~/.qwen/settings.json
# 결과: { "mcpServers": { "test": { "command": "npx", "args": [...] } } }

# Qwen 예시 - 프로젝트 설정
qwen mcp add test npx -y @test/mcp --scope project
cat .qwen/settings.json
```

### 4. TOML vs JSON 형식 차이 검증

Codex(TOML)와 다른 도구(JSON)의 키 이름 차이 확인:

```bash
# Codex TOML - mcp_servers (underscore)
cat ~/.codex/config.toml
# [mcp_servers.server-name]
# command = "npx"

# 다른 도구 JSON - mcpServers (camelCase)
cat ~/.claude.json
# { "mcpServers": { "server-name": {...} } }
```

### 5. 발견 사항

| 발견 | 상세 |
|------|------|
| Qwen MCP 지원 | 공식 문서에 없으나 `qwen mcp --help`로 확인됨 |
| Codex 키 이름 | `mcp_servers` (underscore) - 틀리면 설정 무시됨 |
| Claude Code 경로 | `~/.claude.json` (공식) |
| Gemini 프로젝트 설정 | `.gemini/settings.json` 지원 |
| 스코프 우선순위 | 대부분 Local > Project > User 순서 |

---

## 1. 도구별 MCP 지원 현황

| 도구 | MCP 지원 | 형식 | 전역 설정 | 프로젝트 설정 |
|------|----------|------|----------|--------------|
| Claude Desktop | ✅ | JSON | ✅ | ❌ |
| Claude Code CLI | ✅ | JSON | ✅ | ✅ |
| Cursor IDE | ✅ | JSON | ✅ | ✅ |
| Windsurf IDE | ✅ | JSON | ✅ | ❌ |
| Codex CLI | ✅ | TOML | ✅ | ❌ |
| Gemini CLI | ✅ | JSON | ✅ | ✅ |
| Qwen CLI | ✅ | JSON | ✅ | ✅ |
| GitHub Copilot | ❌ | - | - | - |

---

## 2. Claude Desktop

### 설정 파일 경로

| OS | 경로 |
|----|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%/Claude/claude_desktop_config.json` |

### 설정 구조

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem"],
      "env": {
        "API_KEY": "your-api-key"
      }
    }
  }
}
```

### 필드 설명

| 필드 | 필수 | 설명 |
|------|------|------|
| `command` | ✅ | 실행 명령어 |
| `args` | ✅ | 명령어 인자 배열 |
| `env` | ❌ | 환경 변수 |

**참조**: [Claude Desktop MCP 문서](https://support.claude.com/en/articles/10949351-getting-started-with-local-mcp-servers-on-claude-desktop)

---

## 3. Claude Code CLI

### 설정 파일 경로 (스코프별)

| 스코프 | 경로 | 용도 |
|--------|------|------|
| User (전역) | `~/.claude.json` | 모든 프로젝트에서 사용 |
| Project (팀 공유) | `.mcp.json` (프로젝트 루트) | 버전 관리 포함, 팀 공유 |
| Local (개인) | `~/.claude.json` 내 프로젝트 경로 | 현재 프로젝트에서만 사용 |
| Enterprise | `managed-mcp.json` | 관리자 강제 설정 |

### 스코프 우선순위

```
Enterprise Managed (최우선)
    ↓
Local (프로젝트별 개인)
    ↓
Project (.mcp.json)
    ↓
User (~/.claude.json, 최후순)
```

### 설정 구조 (`~/.claude.json`)

```json
{
  "mcpServers": {
    "server-name": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "mcp-server"],
      "env": {
        "API_KEY": "${API_KEY}"
      }
    }
  }
}
```

### 프로젝트 설정 구조 (`.mcp.json`)

```json
{
  "mcpServers": {
    "shared-server": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": {
        "Authorization": "Bearer ${API_KEY}"
      }
    }
  }
}
```

### 환경 변수 확장

- `${VAR}` - 환경 변수 값
- `${VAR:-default}` - 설정되지 않으면 기본값 사용

### CLI 명령어

```bash
# 전역(user) 스코프로 추가
claude mcp add server-name --scope user -- npx -y mcp-server

# 프로젝트 스코프로 추가
claude mcp add server-name --scope project -- npx -y mcp-server

# 목록 확인
claude mcp list

# 제거
claude mcp remove server-name
```

**참조**: [Claude Code MCP 문서](https://code.claude.com/docs/en/mcp)

---

## 4. Cursor IDE

### 설정 파일 경로

| 스코프 | 경로 |
|--------|------|
| Global (전역) | `~/.cursor/mcp.json` |
| Project (프로젝트) | `.cursor/mcp.json` (프로젝트 루트) |

### 설정 구조

```json
{
  "mcpServers": {
    "server-name": {
      "command": "node",
      "args": ["/path/to/server.js"]
    }
  }
}
```

**참조**: [Cursor MCP 설정 가이드](https://snyk.io/articles/how-to-add-a-new-mcp-server-to-cursor/)

---

## 5. Windsurf IDE

### 설정 파일 경로

| OS | 경로 |
|----|------|
| macOS/Linux | `~/.codeium/windsurf/mcp_config.json` |
| Windows | `%APPDATA%/Codeium/Windsurf/mcp_config.json` |

### 설정 구조

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-xxx"],
      "env": {
        "API_KEY": "your-api-key"
      },
      "disabled": false,
      "alwaysAllow": ["tool-name"]
    }
  }
}
```

### 추가 필드

| 필드 | 설명 |
|------|------|
| `disabled` | 서버 비활성화 (설정 유지) |
| `alwaysAllow` | 자동 승인할 도구 목록 |

**참조**: [Windsurf MCP 문서](https://docs.windsurf.com/windsurf/cascade/mcp)

---

## 6. Codex CLI (OpenAI)

### 설정 파일 경로

| 스코프 | 경로 |
|--------|------|
| Global (전역) | `~/.codex/config.toml` |

> ⚠️ **주의**: Codex는 전역 설정만 지원합니다. 프로젝트별 설정은 보안상 이유로 지원하지 않습니다.

### 설정 구조 (TOML)

```toml
[mcp_servers.filesystem]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-filesystem", "/path"]

[mcp_servers.context7]
command = "npx"
args = ["-y", "@upstash/context7-mcp"]
env = { "API_KEY" = "your-api-key" }
cwd = "/working/directory"
```

### 필드 설명

| 필드 | 필수 | 설명 |
|------|------|------|
| `command` | ✅ | 실행 명령어 |
| `args` | ❌ | 명령어 인자 배열 |
| `env` | ❌ | 환경 변수 |
| `cwd` | ❌ | 작업 디렉토리 |
| `url` | ❌ | HTTP 전송용 엔드포인트 |

### ⚠️ 중요: 키 이름 규칙

- **TOML 섹션명**: `mcp_servers` (underscore 사용)
- JSON 기반 도구의 `mcpServers` (camelCase)와 다름
- 잘못된 키 이름 사용 시 설정이 무시됨

### CLI 명령어

```bash
# 서버 추가
codex mcp add filesystem npx -y @modelcontextprotocol/server-filesystem

# 목록 확인
codex mcp list

# 제거
codex mcp remove filesystem
```

**참조**: [Codex MCP 문서](https://developers.openai.com/codex/mcp/)

---

## 7. Gemini CLI

### 설정 파일 경로

| 스코프 | 경로 |
|--------|------|
| User (전역) | `~/.gemini/settings.json` |
| Project (프로젝트) | `.gemini/settings.json` (프로젝트 루트) |

### 설정 구조

```json
{
  "mcpServers": {
    "server-name": {
      "command": "path/to/server",
      "args": ["--arg1", "value1"],
      "env": {
        "API_KEY": "$MY_API_TOKEN"
      },
      "cwd": "./server-directory",
      "timeout": 30000,
      "trust": false
    }
  },
  "mcp": {
    "allowed": ["trusted-server"],
    "excluded": ["blocked-server"]
  }
}
```

### 전송 타입별 필수 필드 (택일)

| 필드 | 설명 |
|------|------|
| `command` | Stdio 전송용 실행 파일 |
| `url` | SSE 엔드포인트 |
| `httpUrl` | HTTP 스트리밍 엔드포인트 |

### 전역 MCP 설정 (`mcp` 객체)

| 필드 | 설명 |
|------|------|
| `allowed` | 허용할 서버 목록 |
| `excluded` | 차단할 서버 목록 |

**참조**: [Gemini CLI MCP 문서](https://google-gemini.github.io/gemini-cli/docs/tools/mcp-server.html)

---

## 8. Qwen CLI

### 설정 파일 경로

| 스코프 | 경로 |
|--------|------|
| User (전역) | `~/.qwen/settings.json` |
| Project (프로젝트) | `.qwen/settings.json` (프로젝트 루트) |

### 설정 구조

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "mcp-server"],
      "env": {
        "API_KEY": "your-key"
      }
    }
  }
}
```

### CLI 명령어

```bash
# 전역(user) 스코프로 추가
qwen mcp add server-name npx -y mcp-server --scope user

# 프로젝트 스코프로 추가 (기본값)
qwen mcp add server-name npx -y mcp-server --scope project

# 목록 확인
qwen mcp list

# 제거
qwen mcp remove server-name
```

---

## 9. MCP 미지원 도구

### GitHub Copilot

- **MCP 지원**: ❌

---

## 10. mcpServers 공통 스키마

대부분의 JSON 기반 도구가 따르는 공통 구조:

```typescript
interface McpServer {
  command: string;       // 필수: 실행 명령어
  args: string[];        // 필수: 명령어 인자
  env?: Record<string, string>;  // 선택: 환경 변수
  cwd?: string;          // 선택: 작업 디렉토리
  type?: 'stdio' | 'http';       // 선택: 전송 타입
}

interface McpConfig {
  mcpServers: Record<string, McpServer>;
}
```

---

## 11. ai-cli-syncer 동기화 대상

현재 ai-cli-syncer가 동기화하는 경로:

| 도구 | 동기화 경로 | 비고 |
|------|------------|------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | macOS |
| Claude Code | `~/.claude.json` | User scope |
| Cursor | `~/.cursor/mcp.json` | Global |
| Windsurf | `~/.codeium/windsurf/mcp_config.json` | - |
| Codex | `~/.codex/config.toml` | TOML 형식 |
| Gemini | `~/.gemini/settings.json` | User scope |
| Qwen | `~/.qwen/settings.json` | User scope |

> **참고**: UI에서 `Project` 스코프 선택 시, 지원되는 도구에 한해 프로젝트 루트의 MCP 설정 파일(`.cursor/mcp.json` 등)로 동기화됩니다. 지원되지 않는 도구는 에러가 반환됩니다.

---

## 12. 구현 시 주의사항

### TOML vs JSON 키 이름

| 형식 | MCP 키 | 예시 |
|------|--------|------|
| JSON | `mcpServers` (camelCase) | Claude, Cursor, Gemini, Qwen |
| TOML | `mcp_servers` (snake_case) | Codex |

```typescript
// SyncService.ts 구현
const mcpKey = format === 'toml' ? 'mcp_servers' : 'mcpServers';
toolConfig[mcpKey] = { ...toolConfig[mcpKey], ...newServers };
```

### 동기화 전략별 동작

| 전략 | 동작 | 충돌 시 |
|------|------|--------|
| `overwrite` | 기존 설정 전체 교체 | 새것만 유지 |
| `append` | 기존 유지 + 새것 추가 | 새것 우선 |
| `merge` | append와 동일 | 새것 우선 |

### 기타 설정 필드 보존

MCP 동기화 시 `mcpServers`/`mcp_servers` 외의 필드는 보존해야 합니다:

```javascript
// Codex config.toml 예시
// model, approval_mode 등은 건드리지 않음
const parsed = TOML.parse(existingConfig);
parsed.mcp_servers = { ...parsed.mcp_servers, ...newServers };  // mcp_servers만 수정
const output = TOML.stringify(parsed);  // 나머지 필드 보존됨
```

### TOML 라이브러리 출력 형식

`@iarna/toml`은 env를 서브 테이블로 출력하지만, 인라인 테이블과 의미적으로 동일:

```toml
# @iarna/toml 출력 (서브 테이블)
[mcp_servers.server.env]
API_KEY = "value"

# 공식 문서 예시 (인라인 테이블)
env = { API_KEY = "value" }

# 두 형식 모두 동일하게 파싱됨 ✅
```

---

## 13. 변경 이력

| 날짜 | 변경 내용 |
|------|----------|
| 2025-12-07 | 초기 문서 작성 |
| 2025-12-07 | Qwen CLI MCP 지원 추가 (CLI 테스트로 발견) |
| 2025-12-07 | Gemini CLI `supportsMcp: true` 수정 |
| 2025-12-07 | Claude Code 경로 `~/.claude.json`으로 수정 |
| 2025-12-07 | Codex TOML `mcp_servers` 키 처리 로직 추가 |
| 2025-12-09 | MCP 프로젝트 레벨 동기화 지원 (UI Scope/Mode 연동) |
| 2025-12-07 | 조사 방법론 섹션 추가 |
