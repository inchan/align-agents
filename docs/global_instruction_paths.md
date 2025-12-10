# AI 도구별 전역 지침 경로 및 파일명 조사 보고서

이 문서는 주요 AI 코딩 도구들의 전역 설정 및 지침(System Prompt/Instructions) 파일 경로에 대한 조사 결과입니다.

## 1. Claude Desktop

- **전역 설정 파일**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
  - Windows: `%APPDATA%\Claude\claude_desktop_config.json`
  - Linux: `~/.config/Claude/claude_desktop_config.json`
- **전역 지침(System Prompt)**: 데스크톱 앱 자체에는 사용자 접근 가능한 단일 전역 지침 파일이 없습니다. `claude_desktop_config.json`을 통해 MCP 서버를 구성할 수 있습니다.

## 2. Claude Code CLI

- **전역 지침 파일**: `~/.claude/CLAUDE.md`
- **전역 설정 파일**: `~/.claude.json`
- **설명**: `CLAUDE.md` 파일에 작성된 내용은 모든 프로젝트에서 Claude Code가 참조하는 전역 컨텍스트로 사용됩니다.

## 3. GitHub Copilot CLI

- **전역 설정 파일**: `~/.copilot/config.json`
- **지침 파일**:
  - **리포지토리 레벨**: `.github/copilot-instructions.md` (프로젝트 루트)
  - **파일/경로별**: `.github/instructions/*.md`
- **참고**: CLI 전용의 "사용자 전역 지침 파일"은 명시적으로 존재하지 않으며, 주로 리포지토리 단위의 설정을 따릅니다. VS Code 확장의 경우 설정 동기화를 통해 관리됩니다.

## 4. Codex

- **전역 지침 파일**: `~/.codex/AGENTS.md` (본 도구에서 동기화하는 전역 Rules 파일)
- **전역 설정 파일**: `~/.codex/config.toml`
- **설명**: `AGENTS.md` 파일은 모든 프로젝트에 적용되는 전역 지침을 담으며, MCP 설정은 `config.toml`(또는 `config.json`)에 저장됩니다.

## 5. Gemini CLI

- **전역 지침 파일**: `~/.gemini/GEMINI.md`
- **전역 설정 파일**: `~/.gemini/settings.json`
- **시스템 설정**: `/Library/Application Support/GeminiCli/settings.json` (macOS)
- **설명**: `GEMINI.md`는 모든 프로젝트에서 Gemini 모델이 참조하는 전역 컨텍스트 파일입니다.

## 6. Cursor IDE

- **전역 지침(Rules)**: 파일로 직접 관리되지 않음.
  - **관리 방법**: Cursor 설정 UI (`Cursor Settings > Rules`)를 통해 관리하며, 클라우드/로컬 DB에 저장됩니다.
- **프로젝트 지침**:
  - `.cursor/rules/` 폴더 내의 `.mdc` 파일들 (권장)
  - `.cursorrules` (레거시, 프로젝트 루트)

## 7. Windsurf IDE

- **전역 지침 파일**: `~/.codeium/windsurf/memories/global_rules.md`
- **전역 설정 파일**: `~/Library/Application Support/Windsurf/User/settings.json` (macOS)
- **프로젝트 지침**: `.windsurfrules` 또는 `.windsurf/rules/rules.md`

## 8. Qwen CLI

- **전역 지침 파일**: `~/.qwen/QWEN.md`
- **전역 설정 파일**: `~/.qwen/settings.json`
- **설명**: `QWEN.md` 파일이 전역 설정 지침으로 사용됩니다.

---

## 요약 표

| 도구 | 전역 지침 파일 (Global Instructions) | 전역 설정 파일 (Config) | 비고 |
|------|-----------------------------------|------------------------|-----|
| **Claude Desktop** | (없음 / 앱 내장) | `~/Library/Application Support/Claude/claude_desktop_config.json` | MCP 설정 가능 |
| **Claude Code** | `~/.claude/CLAUDE.md` | `~/.claude.json` | |
| **GitHub Copilot** | (리포지토리 단위 `.github/copilot-instructions.md`) | `~/.copilot/config.json` | CLI 전역 지침 파일 없음 |
| **OpenAI Codex** | `~/.codex/AGENTS.md` | `~/.codex/config.toml` | |
| **Gemini CLI** | `~/.gemini/GEMINI.md` | `~/.gemini/settings.json` | |
| **Cursor IDE** | (UI 설정 / 파일 없음) | (UI 설정) | 프로젝트별 `.cursor/rules/` 사용 |
| **Windsurf IDE** | `~/.codeium/windsurf/memories/global_rules.md` | `~/Library/Application Support/Windsurf/User/settings.json` | |
| **Qwen CLI** | `~/.qwen/QWEN.md` | `~/.qwen/settings.json` | |

---

## 부록: 조사 방법론 (Research Methodology)

향후 새로운 AI 도구가 추가될 때, 다음 프로세스를 따라 전역 지침 및 설정 경로를 조사하십시오.

### 1. 계획 및 대상 정의 (Planning)

- **목표**: 조사할 도구의 정확한 명칭과 범위를 정의합니다.
- **체크리스트 작성**: 누락을 방지하기 위해 조사 대상 목록을 문서화합니다.

### 2. 정밀 검색 수행 (Information Gathering)

다음 키워드 패턴을 조합하여 검색을 수행합니다.

- `[Tool Name] global system prompt file location`
- `[Tool Name] global instruction file path`
- `[Tool Name] configuration file location`
- `[Tool Name] global rules path`

### 3. 정보 분석 및 분류 (Analysis)

수집된 정보를 다음 두 가지 유형으로 분류합니다.

- **파일 기반 (File-based)**: 명확한 경로가 존재하는 경우 (예: `~/.claude/CLAUDE.md`)
- **비파일 기반 (Non-file/Config)**: UI 설정, 클라우드 동기화, 또는 앱 내장 설정인 경우 (예: Cursor, Claude Desktop)

### 4. 결과 검증 및 문서화 (Reporting)

- **경로 검증**: OS별(macOS, Windows, Linux) 경로 차이를 확인합니다.
- **대안 확인**: 전역 파일이 없는 경우, 대체 방법(MCP, 리포지토리별 설정 등)을 함께 기록합니다.
- **보고서 업데이트**: 본 문서의 목록과 요약 표에 내용을 추가합니다.
