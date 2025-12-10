# align-agents - 요구사항 명세서

## 1. 개요 (Overview)

**align-agents**는 macOS 환경에서 다양한 AI 개발 도구(CLI, IDE)의 설정을 중앙에서 통합 관리하고 동기화하는 솔루션입니다. 파편화된 AI 도구들의 설정(MCP, Rules 등)을 일원화하여 개발 환경의 일관성을 보장합니다.

## 2. 용어 정의 (Terminology)

| 용어 | 설명 |
|---|---|
| **Tools** | AI 기능을 제공하는 모든 애플리케이션 (Claude Desktop, Cursor, GitHub Copilot 등) |
| **Master Rules** | 모든 Tools에 공통 적용되는 전역 지침(System Instructions). **최우선 순위**로 관리됩니다. |
| **Master MCP** | 중앙에서 관리하는 Model Context Protocol (MCP) 서버 설정 집합. |
| **Master Folder** | 설정과 Rules가 저장되는 루트 경로 (`~/.align-agents/`). |

## 3. 지원 대상 (Supported Tools)

다음 8가지 도구에 대한 자동 탐지 및 설정 동기화를 지원해야 합니다.

1. **Claude Desktop**
2. **GitHub Copilot CLI**
3. **Codex**
4. **Gemini CLI**
5. **Cursor IDE**
6. **Windsurf IDE**
7. **Claude Code CLI**
8. **Qwen CLI**

## 4. 기능 요구사항 (Functional Requirements)

### 4.1 중앙 관리 (Central Management)

- **통합 인터페이스**: CLI 및 로컬 웹 UI를 통해 모든 Tools의 설정을 조회하고 수정할 수 있어야 합니다.
- **내장 에디터**: 설정 파일(JSON, Markdown 등)을 직접 편집할 수 있는 기능을 제공해야 합니다.

### 4.2 Master Rules 동기화 (Priority 1)

- **단일 소스 관리**: `master-rules.md` 파일 하나로 모든 지침을 관리합니다.
- **자동 변환 및 배포**:
  - Master Rules 내용을 각 Tools가 인식하는 파일명과 경로로 자동 변환하여 배포해야 합니다.
  - *참조: [전역 지침 경로 조사 보고서](global_instruction_paths.md)*
- **템플릿 지원**: 언어(TypeScript, Python) 및 프레임워크(React, Next.js)별 표준 Rules 템플릿을 제공해야 합니다.

### 4.3 Master MCP 동기화 (Priority 2)

- **중앙 리포지토리**: MCP 서버 설정을 중앙(`master-mcp.json`)에서 관리합니다.
- **유연한 배포**:
  - **전체 동기화**: 모든 Tools에 Master 설정을 일괄 적용.
  - **선택적 동기화**: 각 Tools별로 필요한 MCP 서버만 선택하여 적용.

### 4.4 동기화 전략 (Synchronization Strategies)

사용자가 상황에 맞춰 선택할 수 있는 3가지 동기화 전략을 지원해야 합니다.
*상세 내용은 [동기화 전략 문서](sync_strategies.md) 참조*

1. **완전 교체 (Overwrite)**: 기존 설정을 삭제하고 Master 설정으로 덮어쓰기.
2. **병합 (Merge)**: 기존 설정 뒤에 Master 설정 추가.
3. **스마트 업데이트 (Smart Update)**: 관리 영역(Block) 내의 변경사항(추가/삭제)만 반영하고 사용자 커스텀 설정은 보존.

### 4.5 자동 탐지 (Auto Detection)

- **탐지 전략**: 다음 3가지 방식을 복합적으로 사용하여 설치 여부를 판단합니다.
  1. **설정 파일 존재 여부 (Primary)**: 동기화 대상인 설정 파일이 존재하는지 확인합니다. (가장 확실함)
  2. **애플리케이션 경로 (Secondary)**: `/Applications/` 내에 해당 앱(.app)이 있는지 확인합니다.
  3. **CLI 명령어 (Tertiary)**: `which` 명령어로 실행 파일이 PATH에 있는지 확인합니다.
- **도구별 탐지 기준**:
  - **Claude Desktop**: `~/Library/Application Support/Claude/claude_desktop_config.json` 또는 `/Applications/Claude.app`
  - **Cursor IDE**: `~/.cursor/` 또는 `/Applications/Cursor.app`
  - **Windsurf IDE**: `~/.codeium/windsurf/` 또는 `/Applications/Windsurf.app`
  - **CLI 도구들 (Claude Code, Copilot, etc.)**: 설정 파일 경로(`~/.claude`, `~/.config/github-copilot` 등) 및 명령어 실행 가능 여부
- 시스템에 설치된 Tools를 자동으로 스캔하고, 설정 파일의 위치를 파악해야 합니다.
- OS별(macOS 우선) 표준 경로를 기반으로 탐색합니다.

### 4.6 히스토리 관리 (History Management)

- **버전 관리**: Master Rules 및 MCP 설정의 변경 이력을 저장해야 합니다.
- **롤백 (Rollback)**: 문제 발생 시 이전 시점의 설정으로 복원할 수 있어야 합니다.
- **변경 로그**: 변경 일시와 내용을 추적할 수 있어야 합니다.

### 4.7 웹 대시보드 (Web Dashboard)

- **시각화**: 연결된 Tools의 상태, 동기화 여부 등을 시각적으로 표시해야 합니다.
- **편의성**: CLI 명령어를 몰라도 웹 UI에서 모든 관리 작업을 수행할 수 있어야 합니다.

## 5. 비기능 요구사항 (Non-Functional Requirements)

- **플랫폼**: macOS 환경을 최우선으로 지원합니다.
- **보안**: 설정 파일 변경 시 자동으로 백업본(`.bak`)을 생성해야 합니다.
- **언어**: 모든 사용자 인터페이스와 문서는 **한국어**로 제공되어야 합니다.
- **확장성**: 향후 새로운 AI 도구가 출시되더라도 쉽게 추가할 수 있는 구조여야 합니다.

## 6. 기술 스택 (Tech Stack)

- **Runtime**: Node.js (TypeScript)
- **CLI**: Commander.js
- **Server**: Fastify
- **UI**: React, Vite, TailwindCSS, Shadcn UI
