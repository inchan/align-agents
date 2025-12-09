# AI CLI Syncer

> AI 도구 설정을 중앙에서 관리하고 동기화하는 CLI 도구

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🎯 개요

AI CLI Syncer는 여러 AI 도구(Claude Desktop, Cursor, Gemini CLI 등)의 설정을 중앙에서 관리하고 동기화할 수 있는 CLI 도구입니다. MCP 서버 설정, Rules, 전역 설정을 한 곳에서 관리하고 각 도구에 자동으로 배포할 수 있습니다.

### 주요 기능

- ✅ **8개 AI 도구 지원**: Claude Desktop, Cursor, Gemini CLI, Codex 등
- ✅ **Stateless 동기화**: 'Active' 상태 없이 원하는 Rule/MCP Set을 명시적으로 선택하여 동기화
- ✅ **Rules Library 관리**: 여러 버전의 Rules를 저장하고 필요에 따라 골라서 배포
- ✅ **동기화 전략**: Overwrite, Merge, Smart Update (마커 기반)
- ✅ **타임스탬프 백업**: `.backup` 디렉토리에 자동 백업 (최대 5개 유지)
- ✅ **히스토리 관리**: 버전 관리 및 롤백 기능
- ✅ **자동 초기화**: 첫 실행 시 자동으로 디렉토리 및 파일 생성
- ✅ **스키마 검증**: Zod를 사용한 설정 파일 유효성 검증
- ✅ **Web UI**: 브라우저에서 설정 관리 및 동기화 (React + Express)
- ✅ **Codex MCP/TOML 지원**: Codex 설정(`.toml`/`.json`)에 MCP 서버 동기화 가능, 전역 Rules는 `~/.codex/AGENTS.md`

## 📚 문서

- [CLI 명령어 레퍼런스](docs/cli-reference.md)
- [Web API 레퍼런스](docs/api-reference.md)
- [아키텍처 문서](docs/architecture.md)
- [개발 가이드라인](docs/dev-guidelines.md)
- [동기화 전략](docs/sync_strategies.md)
- [사용 시나리오](docs/usage_scenarios.md)

## 🚀 빠른 시작

### 설치

```bash
# 저장소 클론
git clone https://github.com/your-username/ai-cli-syncer.git
cd ai-cli-syncer

# 의존성 설치
npm install

# 빌드
npm run build
```

### 초기 설정

AI CLI Syncer는 첫 실행 시 자동으로 초기화됩니다!

```bash
# 전역 Rules 동기화 (대화형으로 Rule 선택)
./packages/cli/bin/acs rules sync --all

# 또는 수동 초기화
./packages/cli/bin/acs init
```

### 기본 사용법

```bash
# 1. 전역 Rules 동기화 (소스 ID 지정)
./packages/cli/bin/acs rules sync --all --source <rule-id> --verbose

# 2. 전역 Rules 동기화 (대화형 선택)
./packages/cli/bin/acs rules sync --all

# 3. 프로젝트 Rules 동기화 (소스 ID 지정)
./packages/cli/bin/acs rules sync --all --project . --source <rule-id>

# 3. 동기화 전략 선택
./packages/cli/bin/acs rules sync --all --strategy overwrite

# 4. 히스토리 관리
./packages/cli/bin/acs history list
./packages/cli/bin/acs history restore <version-id>

# 5. MCP 서버 추가
./packages/cli/bin/acs mcp add my-server --command node --args server.js

# 6. MCP 동기화 (대화형으로 Set 선택)
./packages/cli/bin/acs sync --tool claude-desktop

# 7. MCP 동기화 (소스 ID 지정)
./packages/cli/bin/acs sync --tool claude-desktop --source <set-id>
```

## 📖 명령어 레퍼런스

### `acs init`

초기 설정을 자동으로 수행합니다.

```bash
acs init
```

### `acs scan`

설치된 AI 도구를 스캔하고 Registry를 업데이트합니다.

```bash
acs scan
```

### `acs status`

전체 동기화 상태를 확인합니다.

```bash
acs status
```

### `acs mcp`

마스터 MCP 서버를 관리합니다.

```bash
# 서버 추가
acs mcp add <name> --command <cmd> --args <arg1> <arg2>

# 서버 목록
acs mcp list

# 서버 삭제
acs mcp remove <name>
```

**예제:**

```bash
# Filesystem MCP 서버 추가
acs mcp add filesystem --command npx --args "-y @modelcontextprotocol/server-filesystem /Users/username/Documents"

# Brave Search MCP 서버 추가
acs mcp add brave-search --command npx --args "-y @modelcontextprotocol/server-brave-search" --env BRAVE_API_KEY=your_key
```

### `acs mcp-set`

MCP 서버 그룹(Set)을 관리합니다. 상황에 따라 다른 MCP 구성을 빠르게 전환할 수 있습니다.

```bash
# Set 목록
acs mcp-set list

# Set 생성
acs mcp-set create "Dev Tools"

# Set 활성화
acs mcp-set activate "Dev Tools"
```

### `acs sync`

MCP 설정을 각 도구에 동기화합니다.

```bash
# 특정 도구에 동기화
acs sync --tool claude-desktop

# 모든 도구에 동기화 (프로젝트 경로 필요)
acs sync --all --project /path/to/project
```

### `acs rules`

마스터 Rules를 관리하고 동기화합니다.

```bash
# Rules 보기 (대화형 리스트)
acs rules list

# Rules 보기 (상세)
acs rules show <id>

# Rules 편집 (기본 에디터)
acs rules edit

# 템플릿 목록
acs rules template list

# 템플릿 적용
acs rules template apply react

# Rules 동기화 (대화형)
acs rules sync --tool claude-code --project /path/to/project

# Rules 동기화 (ID 지정)
acs rules sync --tool claude-code --project /path/to/project --source <rule-id>
```

### `acs backup`

설정을 Git으로 백업하고 복원합니다.

```bash
# 백업 생성
acs backup create "Backup message"

# 백업 목록
acs backup list

# 백업 복원
acs backup restore <hash>
```

### `acs validate`

설정 파일의 유효성을 검증합니다.

```bash
# 모든 설정 검증
acs validate

# 특정 설정만 검증
acs validate --mcp
acs validate --rules
acs validate --config
```

### `acs config`

전역 설정을 관리합니다.

```bash
# 설정 보기
acs config show

# 설정 편집
acs config edit
```

### Web UI 사용

Web UI를 통해 브라우저에서 설정을 관리할 수 있습니다.

```bash
# 개발 모드 (API 서버 + 웹 UI)
npm run dev

# 또는 개별 실행
npm run dev -w @ai-cli-syncer/api  # API 서버 (포트 3001)
npm run dev -w packages/web         # 웹 UI (포트 5173)
```

브라우저에서 `http://localhost:5173`으로 접속하면:

- **Dashboard**: 설치된 도구 현황 및 통계
- **Rules 관리**: Master Rules 조회, 편집, 저장, 동기화
- **Dashboard**: 설치된 도구 현황 및 통계
- **Rules 관리**: Master Rules 조회, 편집, 저장, 동기화
- **MCP 관리**:
    - **MCP Sets**: 여러 MCP 구성을 Set으로 관리하고 원클릭으로 전환 (활성화)
    - **Import**: JSON 파일 또는 GitHub URL(자동 감지)에서 MCP 설정 가져오기
    - **Edit**: MCP Set 제목/설명 및 개별 서버 설정 인라인 편집

## 📁 디렉토리 구조

```text
~/.config/ai-cli-syncer/
├── master-mcp.json       # 마스터 MCP 서버 목록
├── master-rules.md       # 마스터 Rules
├── sync-config.json      # MCP 동기화 설정
├── rules-config.json     # Rules 동기화 설정
├── config.json           # 전역 설정
└── .git/                 # Git 저장소 (백업용)
```

## 🔧 지원하는 AI 도구

| 도구 | 설정 파일 경로 | MCP 지원 | Rules 지원 |
|------|---------------|----------|-----------|
| Claude Desktop | `~/Library/Application Support/Claude/claude_desktop_config.json` | ✅ | - |
| GitHub Copilot CLI | `~/.config/github-copilot/` | - | - |
| Codex | `~/.codex/config.toml` | ✅ | ✅ (AGENTS.md) |
| Gemini CLI | `~/.gemini/settings.json` | - | ✅ (GEMINI.md) |
| Claude Code CLI | `~/.claude/settings.json` | - | ✅ (CLAUDE.md) |
| Qwen CLI | `~/.qwen/settings.json` | - | - |
| Cursor IDE | `~/.cursor/cli-config.json` | - | ✅ (.cursorrules) |
| Windsurf IDE | `~/.codeium/windsurf/settings.json` | - | - |

## 💡 사용 예제

### 예제 1: MCP 서버 설정 및 동기화

```bash
# 1. Filesystem MCP 서버 추가
acs mcp add filesystem \
  --command npx \
  --args "-y @modelcontextprotocol/server-filesystem /Users/username/Documents"

# 2. Claude Desktop에 동기화
acs sync --tool claude-desktop

# 3. 백업 생성
acs backup create "Added filesystem MCP server"
```

### 예제 2: Rules 템플릿 적용 및 동기화

```bash
# 1. React 템플릿 적용
acs rules template apply react

# 2. Rules 편집 (추가 커스터마이징)
acs rules edit

# 3. Claude Code CLI에 동기화
acs rules sync --tool claude-code --project /path/to/my-react-project

# 4. 백업 생성
acs backup create "Applied React rules template"
```

### 예제 3: 백업 및 복원

```bash
# 1. 현재 상태 백업
acs backup create "Before major changes"

# 2. 설정 변경...
acs mcp add new-server --command node --args server.js

# 3. 백업 목록 확인
acs backup list

# 4. 이전 상태로 복원
acs backup restore abc1234
```

## 🛠️ 개발

### 프로젝트 구조

```text
ai-cli-syncer/
├── packages/
│   ├── cli/                    # CLI 패키지
│   │   ├── src/
│   │   │   ├── commands/       # CLI 명령어
│   │   │   ├── services/       # 비즈니스 로직
│   │   │   ├── use-cases/      # Use Case Layer
│   │   │   ├── infrastructure/ # Repository 구현
│   │   │   ├── interfaces/     # 인터페이스 정의
│   │   │   ├── schemas/        # Zod 스키마
│   │   │   └── lib.ts          # 라이브러리 진입점
│   │   └── bin/acs             # 실행 파일
│   ├── api/                    # API 서버 패키지
│   │   ├── src/
│   │   │   ├── controllers/    # API 컨트롤러
│   │   │   ├── routes/         # 라우트 정의
│   │   │   ├── container.ts    # DI 컨테이너
│   │   │   └── server.ts       # Express 서버
│   │   └── dist/               # 빌드 결과
│   └── web/                    # Web UI 패키지
│       ├── src/
│       │   ├── pages/          # React 페이지
│       │   ├── components/     # React 컴포넌트
│       │   ├── lib/            # API 클라이언트
│       │   └── layouts/        # 레이아웃
│       └── dist/               # 빌드 결과
└── docs/                       # 문서
```

### 빌드 및 개발

```bash
# 전체 빌드
npm run build

# 개발 모드 (전체)
npm run dev

# 개별 패키지 빌드
npm run build -w @ai-cli-syncer/cli
npm run build -w @ai-cli-syncer/api
npm run build -w packages/web

# 테스트 실행
npm test -w @ai-cli-syncer/cli
```

### 아키텍처

이 프로젝트는 **SOLID 원칙**을 따르며 다음과 같은 아키텍처를 사용합니다:

- **Dependency Injection**: 모든 서비스는 인터페이스를 통해 주입됩니다
- **Repository Pattern**: 데이터 접근 로직을 추상화합니다
- **Use Case Layer**: 비즈니스 로직을 캡슐화합니다
- **Clean Architecture**: 도메인 로직과 인프라를 분리합니다

자세한 내용은 [`docs/architecture.md`](docs/architecture.md)를 참조하세요.

## 🔒 보안

- 모든 설정 변경은 Git으로 버전 관리됩니다
- API 키 등 민감한 정보는 환경 변수로 관리하세요
- `.gitignore`에 민감한 파일을 추가하세요

## 🐛 트러블슈팅

### 도구가 스캔되지 않는 경우

```bash
# Registry를 삭제하고 다시 스캔
rm ~/.ai-cli-syncer/registry.json
acs scan
```

### 동기화가 실패하는 경우

```bash
# 설정 파일 검증
acs validate

# 상태 확인
acs status
```

### 백업 복원 후 문제가 있는 경우

```bash
# 백업 목록 확인
acs backup list

# 다른 백업으로 복원
acs backup restore <hash>
```

## 📝 라이선스

MIT

## 🤝 기여

이슈와 PR을 환영합니다!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
