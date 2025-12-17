# 지원 도구 (Supported Tools)

align-agents가 지원하는 AI 도구들의 상세 정보입니다.

---

## 지원 현황 요약

| 도구 | 유형 | MCP | Rules | 상태 |
|------|------|:---:|:-----:|------|
| [Claude Desktop](#claude-desktop) | Desktop App | ✅ | - | 완전 지원 |
| [Cursor IDE](#cursor-ide) | IDE | - | ✅ | 완전 지원 |
| [Claude Code CLI](#claude-code-cli) | CLI | - | ✅ | 완전 지원 |
| [Gemini CLI](#gemini-cli) | CLI | - | ✅ | 완전 지원 |
| [Codex CLI](#codex-cli) | CLI | ✅ | ✅ | 완전 지원 |
| [Qwen CLI](#qwen-cli) | CLI | - | - | 탐지만 |
| [GitHub Copilot CLI](#github-copilot-cli) | CLI | - | - | 탐지만 |
| [Windsurf IDE](#windsurf-ide) | IDE | - | - | 탐지만 |

---

## 상세 정보

### Claude Desktop

Anthropic의 공식 Claude 데스크톱 애플리케이션입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | Anthropic |
| **유형** | Desktop Application |
| **플랫폼** | macOS, Windows |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | ✅ | MCP 서버 설정 동기화 |
| **Rules 동기화** | - | 미지원 (자체 규칙 없음) |
| **자동 탐지** | ✅ | 설정 파일 및 앱 경로 |

#### 설정 파일
```
경로: ~/Library/Application Support/Claude/claude_desktop_config.json
형식: JSON
```

#### 설정 구조 예시
```json
{
  "mcpServers": {
    "postgresql": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "DATABASE_URL": "postgresql://localhost/mydb"
      }
    }
  }
}
```

---

### Cursor IDE

AI 기능이 내장된 VS Code 기반 IDE입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | Cursor Inc. |
| **유형** | IDE |
| **플랫폼** | macOS, Windows, Linux |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | - | 미지원 |
| **Rules 동기화** | ✅ | .cursorrules 파일 |
| **자동 탐지** | ✅ | 설정 폴더 및 앱 경로 |

#### 설정 파일
```
전역 Rules: ~/.cursor/rules/.cursorrules
프로젝트 Rules: ./.cursorrules
형식: Plain Text
```

#### Rules 파일 예시
```
You are an expert TypeScript developer.

Coding Style:
- Use functional components with hooks
- Prefer const over let
- Always add proper TypeScript types
```

---

### Claude Code CLI

Anthropic의 공식 Claude CLI 도구입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | Anthropic |
| **유형** | CLI |
| **설치** | `npm install -g @anthropic-ai/claude-code` |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | - | 미지원 |
| **Rules 동기화** | ✅ | CLAUDE.md 파일 |
| **자동 탐지** | ✅ | 설정 파일 및 CLI |

#### 설정 파일
```
전역 Rules: ~/.claude/CLAUDE.md
프로젝트 Rules: ./CLAUDE.md
형식: Markdown
```

#### CLAUDE.md 예시
```markdown
# Project Guidelines

## Coding Standards
- Use TypeScript for all new code
- Follow SOLID principles
- Write unit tests for business logic

## Architecture
- Clean Architecture layers
- Repository pattern for data access
```

---

### Gemini CLI

Google의 Gemini AI CLI 도구입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | Google |
| **유형** | CLI |
| **설치** | `npm install -g @google/gemini-cli` |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | - | 미지원 |
| **Rules 동기화** | ✅ | GEMINI.md 파일 |
| **자동 탐지** | ✅ | 설정 파일 및 CLI |

#### 설정 파일
```
전역 Rules: ~/.gemini/GEMINI.md
프로젝트 Rules: ./GEMINI.md
형식: Markdown
```

---

### Codex CLI

OpenAI의 Codex 기반 CLI 도구입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | OpenAI |
| **유형** | CLI |
| **설치** | `npm install -g @openai/codex` |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | ✅ | config.toml 또는 config.json |
| **Rules 동기화** | ✅ | AGENTS.md 파일 |
| **자동 탐지** | ✅ | 설정 폴더 및 CLI |

#### 설정 파일
```
MCP 설정: ~/.codex/config.toml (또는 config.json)
전역 Rules: ~/.codex/AGENTS.md
프로젝트 Rules: ./AGENTS.md
```

#### MCP 설정 예시 (TOML)
```toml
[mcp_servers.postgresql]
command = "npx"
args = ["-y", "@modelcontextprotocol/server-postgres"]

[mcp_servers.postgresql.env]
DATABASE_URL = "postgresql://localhost/mydb"
```

---

### Qwen CLI

Alibaba의 Qwen AI CLI 도구입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | Alibaba |
| **유형** | CLI |
| **설치** | 별도 설치 필요 |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | - | 미지원 |
| **Rules 동기화** | - | 미지원 |
| **자동 탐지** | ✅ | 설정 파일 확인 |

#### 설정 파일
```
설정: ~/.qwen/settings.json
```

---

### GitHub Copilot CLI

GitHub의 AI 코딩 어시스턴트 CLI입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | GitHub (Microsoft) |
| **유형** | CLI |
| **설치** | `gh extension install github/gh-copilot` |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | - | 미지원 |
| **Rules 동기화** | - | 미지원 |
| **자동 탐지** | ✅ | 설정 폴더 확인 |

#### 설정 파일
```
설정: ~/.config/github-copilot/
```

---

### Windsurf IDE

Codeium의 AI 기반 IDE입니다.

#### 기본 정보
| 항목 | 내용 |
|------|------|
| **개발사** | Codeium |
| **유형** | IDE |
| **플랫폼** | macOS, Windows, Linux |

#### align-agents 지원
| 기능 | 지원 | 설명 |
|------|:----:|------|
| **MCP 동기화** | - | 미지원 |
| **Rules 동기화** | - | 미지원 |
| **자동 탐지** | ✅ | 설정 폴더 및 앱 경로 |

#### 설정 파일
```
설정: ~/.codeium/windsurf/settings.json
앱 경로: /Applications/Windsurf.app
```

---

## 도구별 Rules 파일 매핑

align-agents는 단일 Rules 내용을 각 도구의 형식으로 자동 변환합니다.

```
┌────────────────────┐
│   Rules 저장소     │
│  (Master Content)  │
└─────────┬──────────┘
          │
          ├──────────────┬──────────────┬──────────────┐
          ▼              ▼              ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
    │CLAUDE.md │  │GEMINI.md │  │.cursorrule│  │AGENTS.md │
    └──────────┘  └──────────┘  └──────────┘  └──────────┘
    Claude Code    Gemini CLI    Cursor IDE    Codex CLI
```

---

## 탐지 우선순위

각 도구는 다음 순서로 탐지됩니다:

1. **설정 파일 존재 여부** (가장 확실)
2. **애플리케이션 경로** (Desktop App)
3. **CLI 명령어** (`which` 명령어)

```bash
# 탐지 실행
./packages/cli/bin/acs scan

# 결과 확인
./packages/cli/bin/acs status
```

---

## 향후 지원 계획

### 우선순위 높음
- Windsurf IDE Rules 지원
- Qwen CLI Rules 지원

### 검토 중
- VS Code Copilot Extension
- JetBrains AI Assistant

---

## 관련 문서

- [PRD](prd.md) - 제품 요구사항
- [용어 정의](glossary.md) - 용어 설명
- [사용자 시나리오](user-scenarios.md) - 사용 예시
- [기능 명세](features.md) - 상세 기능
