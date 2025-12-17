# 기능 명세 (Features Specification)

align-agents의 상세 기능 명세입니다.

---

## 1. Rules 관리

### 1.1 Rules 저장소

중앙에서 여러 Rules를 저장하고 관리하는 기능입니다.

#### 기능
| 기능 | 설명 |
|------|------|
| **생성** | 새로운 Rules 생성 (제목, 내용, 설명) |
| **조회** | 저장된 Rules 목록 및 상세 내용 확인 |
| **수정** | 기존 Rules 내용 편집 |
| **삭제** | 불필요한 Rules 삭제 |
| **검색** | 제목/내용으로 Rules 검색 |

#### Rules 속성
```
Rules
├── id: string           # 고유 식별자 (자동 생성)
├── name: string         # Rules 이름
├── description: string  # Rules 설명
├── content: string      # Rules 내용 (Markdown)
├── createdAt: Date      # 생성 일시
└── updatedAt: Date      # 수정 일시
```

---

### 1.2 Rules 동기화

선택한 Rules를 각 AI 도구에 적용하는 기능입니다.

#### 동기화 범위

| 범위 | 옵션 | 대상 경로 |
|------|------|----------|
| **전역** | `--global` (기본값) | `~/.claude/CLAUDE.md` 등 |
| **프로젝트** | `--project <경로>` | `./CLAUDE.md` 등 |
| **특정 도구** | `--tool <도구명>` | 해당 도구만 |
| **전체 도구** | `--all` | 모든 지원 도구 |

#### 동기화 전략

| 전략 | 동작 | 적합한 상황 |
|------|------|------------|
| **Overwrite** | 기존 파일 완전 교체 | 초기 설정, 전면 변경 |
| **Merge** | 기존 내용 뒤에 추가 | 기존 설정 유지 |
| **Smart Update** | 마커 영역만 업데이트 | 사용자 커스텀 보존 |

#### 자동 변환

Rules 내용을 각 도구의 형식으로 자동 변환합니다.

| 도구 | 변환 파일 | 형식 |
|------|----------|------|
| Claude Code CLI | `CLAUDE.md` | Markdown |
| Gemini CLI | `GEMINI.md` | Markdown |
| Cursor IDE | `.cursorrules` | Plain Text |
| Codex CLI | `AGENTS.md` | Markdown |

---

## 2. MCP 관리

### 2.1 MCP Definitions

개별 MCP 서버 설정을 관리합니다.

#### Definition 속성
```
MCP Definition
├── id: string           # 고유 식별자
├── name: string         # 서버 이름 (예: postgresql)
├── command: string      # 실행 명령어 (예: npx)
├── args: string[]       # 명령어 인자
├── env: object          # 환경 변수
├── description: string  # 설명
└── createdAt: Date      # 생성 일시
```

#### 관리 기능
- **Import**: JSON 파일 또는 GitHub URL에서 가져오기
- **Export**: JSON 형식으로 내보내기
- **편집**: 인라인 편집 지원

---

### 2.2 MCP Sets

여러 MCP Definition을 그룹으로 관리합니다.

#### Set 속성
```
MCP Set
├── id: string                    # 고유 식별자
├── name: string                  # Set 이름
├── description: string           # 설명
├── definitions: Definition[]     # 포함된 MCP 서버들
└── createdAt: Date               # 생성 일시
```

#### 관리 기능
- **생성**: 새 Set 생성 후 Definition 추가
- **편집**: Set 정보 및 포함 Definition 수정
- **복제**: 기존 Set을 복사하여 새 Set 생성
- **삭제**: Set 삭제 (Definition은 유지)

---

### 2.3 MCP 동기화

MCP Set을 각 도구에 적용합니다.

#### 지원 도구
| 도구 | 설정 파일 | 형식 |
|------|----------|------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | JSON |
| Codex CLI | `~/.codex/config.toml` | TOML |

#### 동기화 옵션
```bash
# 특정 도구
./packages/cli/bin/acs sync --tool claude-desktop --source <set-id>

# 모든 도구
./packages/cli/bin/acs sync --all --source <set-id>

# 대화형 선택
./packages/cli/bin/acs sync --tool claude-desktop
```

---

## 3. 자동 탐지

### 3.1 도구 탐지

시스템에 설치된 AI 도구를 자동으로 감지합니다.

#### 탐지 방법 (우선순위 순)
1. **설정 파일 확인**: 가장 확실한 방법
2. **애플리케이션 경로**: `/Applications/` 확인
3. **CLI 명령어**: `which` 명령어로 확인

#### 도구별 탐지 기준

| 도구 | 설정 파일 | 애플리케이션 | CLI |
|------|----------|-------------|-----|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | `/Applications/Claude.app` | - |
| Cursor IDE | `~/.cursor/` | `/Applications/Cursor.app` | - |
| Claude Code CLI | `~/.claude.json` | - | `claude` |
| Gemini CLI | `~/.gemini/settings.json` | - | `gemini` |
| Codex CLI | `~/.codex/` | - | `codex` |

---

### 3.2 Registry 관리

탐지된 도구 정보를 저장합니다.

```bash
# 도구 스캔
./packages/cli/bin/acs scan

# 결과 확인
./packages/cli/bin/acs status
```

---

## 4. 히스토리 관리

### 4.1 버전 기록

모든 설정 변경을 자동으로 기록합니다.

#### 기록 대상
- Rules 내용 변경
- MCP Set 변경
- 동기화 실행 이력

#### 히스토리 속성
```
History Entry
├── id: string           # 버전 ID (타임스탬프 기반)
├── type: string         # rules | mcp | sync
├── content: string      # 변경된 내용
├── timestamp: Date      # 변경 일시
└── description: string  # 변경 설명
```

---

### 4.2 롤백

특정 버전으로 설정을 복원합니다.

```bash
# 히스토리 목록
./packages/cli/bin/acs history list
./packages/cli/bin/acs history list --type rules

# 특정 버전 내용 확인
./packages/cli/bin/acs history show <version-id>

# 복원
./packages/cli/bin/acs history restore <version-id>
```

---

### 4.3 자동 백업

동기화 전 자동으로 백업을 생성합니다.

#### 백업 정책
- **위치**: `.backup/` 폴더
- **형식**: `파일명.타임스탬프`
- **보관**: 최대 5개 (오래된 것 자동 삭제)

---

## 5. 사용자 인터페이스

### 5.1 CLI (Command Line Interface)

모든 기능을 명령어로 사용할 수 있습니다.

#### 주요 명령어

| 명령어 | 설명 |
|--------|------|
| `acs init` | 초기 설정 |
| `acs ui` | Web UI 실행 |
| `acs scan` | 도구 탐지 |
| `acs status` | 상태 확인 |
| `acs rules sync` | Rules 동기화 |
| `acs sync` | MCP 동기화 |
| `acs history` | 히스토리 관리 |
| `acs backup` | 백업 관리 |
| `acs validate` | 설정 검증 |
| `acs config` | 전역 설정 |

#### 공통 옵션
| 옵션 | 설명 |
|------|------|
| `--verbose` | 상세 출력 |
| `--dry-run` | 실제 실행 없이 결과 미리보기 |
| `--source <id>` | 동기화할 Rules/MCP Set ID |
| `--strategy <전략>` | 동기화 전략 |

---

### 5.2 Web UI (Dashboard)

브라우저 기반 시각적 관리 인터페이스입니다.

#### 주요 페이지

| 페이지 | 기능 |
|--------|------|
| **Dashboard** | 설치된 도구 현황, 동기화 상태 요약, 빠른 작업 |
| **Rules** | Rules 저장소 관리, 동기화 실행 |
| **MCP** | MCP Definitions/Sets 관리, Import/Export |
| **Projects** | 프로젝트별 설정 관리 |
| **Logs** | 동기화 로그, 에러 확인 |

#### 실행 방법
```bash
# CLI로 실행
./packages/cli/bin/acs ui

# 포트 지정
./packages/cli/bin/acs ui --port 4000

# 브라우저 자동 열기 비활성화
./packages/cli/bin/acs ui --no-open
```

---

## 6. 데이터 저장

### 6.1 SQLite 데이터베이스

모든 설정 데이터를 SQLite에 저장합니다.

#### 저장 위치
```
~/.acs/data.db
```

#### 테이블 구조
- `rules`: Rules 저장소
- `mcp_definitions`: MCP 서버 정의
- `mcp_sets`: MCP Set
- `history`: 변경 이력
- `registry`: 탐지된 도구 정보

---

### 6.2 설정 검증

Zod 스키마를 사용한 유효성 검증을 제공합니다.

```bash
# 모든 설정 검증
./packages/cli/bin/acs validate

# 특정 설정만 검증
./packages/cli/bin/acs validate --rules
./packages/cli/bin/acs validate --mcp
./packages/cli/bin/acs validate --config
```

---

## 관련 문서

- [PRD](prd.md) - 제품 요구사항
- [용어 정의](glossary.md) - 용어 설명
- [사용자 시나리오](user-scenarios.md) - 사용 예시
- [지원 도구](supported-tools.md) - 도구별 상세
