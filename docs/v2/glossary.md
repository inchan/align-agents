# 용어 정의 (Glossary)

align-agents 프로젝트에서 사용되는 핵심 용어들의 정의입니다.

---

## 핵심 개념

### Tools (AI 도구)

AI 기능을 제공하는 모든 애플리케이션을 통칭합니다.

| 유형 | 예시 |
|------|------|
| **Desktop App** | Claude Desktop, Cursor IDE, Windsurf IDE |
| **CLI** | Claude Code CLI, Gemini CLI, Codex CLI, Qwen CLI |
| **Extension** | GitHub Copilot |

---

### Rules

AI 도구에 적용되는 **코딩 가이드라인 및 시스템 지침**입니다.

#### 특징
- Markdown 형식으로 작성
- 각 도구별로 다른 파일명으로 변환됨
  - Claude Code → `CLAUDE.md`
  - Gemini CLI → `GEMINI.md`
  - Cursor IDE → `.cursorrules`
  - Codex CLI → `AGENTS.md`

#### 적용 범위
| 범위 | 위치 | 설명 |
|------|------|------|
| **전역 (Global)** | `~/.claude/CLAUDE.md` | 모든 프로젝트에 적용 |
| **프로젝트 (Project)** | `./CLAUDE.md` | 해당 프로젝트에만 적용 |

---

### Rules 저장소

중앙에서 관리되는 **Rules 집합**입니다.

- 여러 버전의 Rules를 저장하고 관리
- 각 Rules는 고유 ID를 가짐
- 동기화 시 특정 Rules를 선택하여 적용

```
Rules 저장소
├── rule-001: "TypeScript 프로젝트용"
├── rule-002: "Python 프로젝트용"
└── rule-003: "React 프로젝트용"
```

---

### MCP (Model Context Protocol)

AI 도구가 **외부 서비스와 연동하는 프로토콜**입니다.

#### 구성 요소

| 용어 | 설명 |
|------|------|
| **MCP Server** | 외부 서비스(DB, API 등)와 통신하는 서버 |
| **MCP Definition** | 개별 MCP 서버의 설정 정의 |
| **MCP Set** | 여러 MCP Definition을 그룹으로 묶은 것 |

#### 예시
```json
{
  "name": "postgresql",
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-postgres"],
  "env": {
    "DATABASE_URL": "postgresql://..."
  }
}
```

---

### MCP Set

여러 MCP Definition을 **논리적 그룹으로 묶은 것**입니다.

#### 사용 예
- "개발 환경용 Set": PostgreSQL + Redis + Filesystem
- "프로덕션용 Set": PostgreSQL + Monitoring
- "프론트엔드용 Set": Filesystem + Browser

---

## 동기화 관련

### Sync (동기화)

중앙의 Rules 또는 MCP 설정을 **각 AI 도구에 적용**하는 과정입니다.

```
[Rules 저장소] ──sync──> [Claude Code]
                     └──> [Cursor IDE]
                     └──> [Gemini CLI]
```

---

### Source ID

동기화할 **Rules 또는 MCP Set의 고유 식별자**입니다.

- CLI에서 `--source <id>` 옵션으로 지정
- 미지정 시 대화형으로 선택

```bash
# Source ID 지정 동기화
acs rules sync --all --source rule-001

# 대화형 선택
acs rules sync --all
? 동기화할 Rules를 선택하세요:
  > rule-001: TypeScript 프로젝트용
    rule-002: Python 프로젝트용
```

---

### 동기화 전략 (Sync Strategy)

설정을 적용하는 **방식**을 정의합니다.

| 전략 | 동작 | 사용 상황 |
|------|------|----------|
| **Overwrite** | 기존 내용 삭제 후 새 내용으로 교체 | 초기 설정, 전체 리셋 |
| **Merge** | 기존 내용 뒤에 새 내용 추가 | 기존 설정 유지하며 추가 |
| **Smart Update** | 마커 영역 내 내용만 업데이트 | 사용자 커스텀 설정 보존 |

---

### 마커 (Marker)

Smart Update 전략에서 **관리 영역을 표시**하는 주석입니다.

```markdown
<!-- align-agents:start -->
이 영역의 내용만 동기화됩니다.
<!-- align-agents:end -->

사용자가 추가한 내용은 보존됩니다.
```

---

## 저장 및 관리

### Master Folder

align-agents의 **설정이 저장되는 루트 경로**입니다.

- 기본 경로: `~/.acs/`
- 구성:
  ```
  ~/.acs/
  ├── data.db           # SQLite 데이터베이스
  ├── .backup/          # 자동 백업 파일
  └── logs/             # 동기화 로그
  ```

---

### Registry

시스템에 **설치된 AI 도구 정보**를 저장하는 파일입니다.

- `acs scan` 명령어로 갱신
- 도구 이름, 설정 파일 경로, 설치 상태 등 포함

---

### History (히스토리)

Rules 및 MCP 설정의 **변경 이력**입니다.

- 버전별로 저장
- 특정 버전으로 롤백 가능
- 변경 일시, 변경 내용 추적

---

### Backup (백업)

동기화 전 자동으로 생성되는 **설정 파일 복사본**입니다.

- 위치: `.backup/` 폴더
- 형식: `파일명.타임스탬프`
- 최대 5개 유지 (오래된 것 자동 삭제)

```
.backup/
├── CLAUDE.md.20251201-100000
├── CLAUDE.md.20251201-090000
└── .cursorrules.20251201-100000
```

---

## 관련 문서

- [PRD](prd.md) - 제품 요구사항
- [사용자 시나리오](user-scenarios.md) - 사용 예시
- [기능 명세](features.md) - 상세 기능
- [지원 도구](supported-tools.md) - 도구별 상세
