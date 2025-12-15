# align-agents Architecture

## 1. Architectural Principles

우리는 **유지보수성(Maintainability)**, **테스트 용이성(Testability)**, **확장성(Scalability)**을 핵심 가치로 삼으며, 이를 달성하기 위해 다음 원칙을 준수합니다.

### 1.1 SOLID Principles

- **SRP (Single Responsibility Principle)**: 모든 클래스와 모듈은 단 하나의 변경 이유만을 가져야 합니다.
- **OCP (Open/Closed Principle)**: 확장에는 열려 있어야 하고, 변경에는 닫혀 있어야 합니다. (새로운 도구 추가 시 기존 코드 수정 최소화)
- **LSP (Liskov Substitution Principle)**: 상위 타입의 객체를 하위 타입의 객체로 치환해도 프로그램은 정상 작동해야 합니다.
- **ISP (Interface Segregation Principle)**: 클라이언트는 자신이 사용하지 않는 메서드에 의존하지 않아야 합니다.
- **DIP (Dependency Inversion Principle)**: 고수준 모듈은 저수준 모듈에 의존해서는 안 되며, 둘 다 추상화에 의존해야 합니다.

### 1.2 Clean Architecture (Layered)

관심사의 분리를 위해 시스템을 계층화합니다. 의존성은 항상 **안쪽(고수준 정책)**을 향해야 합니다.

```mermaid
graph TD
    subgraph "Infrastructure Layer (External)"
        DB[(SQLite Database)]
        FS[File System]
        Git[Git]
        CLI[CLI Interface]
        Web[Web UI]
        Express[Express Server (Dev/API)]
        Fastify[Fastify Server (CLI Embedded)]
    end

    subgraph "Interface Adapters Layer"
        Controllers[Controllers]
        Presenters[Presenters]
        Gateways[Gateways/Repositories]
    end

    subgraph "Application Layer (Use Cases)"
        SyncUC[Sync Use Cases]
        BackupUC[Backup Use Cases]
        HistoryUC[History Use Cases]
    end

    subgraph "Domain Layer (Entities)"
        Rules[Rules Entity]
        MCP[MCP Config Entity]
        Tool[Tool Entity]
    end

    CLI --> Controllers
    Web --> Express
    Web --> Fastify
    Express --> Controllers
    Fastify --> Controllers
    Controllers --> SyncUC
    Controllers --> BackupUC
    SyncUC --> Rules
    SyncUC --> MCP
    SyncUC --> Gateways
    Gateways --> DB
    Gateways --> FS
    Gateways --> Git
```

## 2. Layer Details

### 2.1 Domain Layer

- **역할**: 핵심 비즈니스 로직과 엔티티를 정의합니다. 외부 라이브러리나 프레임워크에 의존하지 않습니다.
- **구성 요소**:
  - `Rule`: Rule의 내용과 메타데이터
  - `McpConfig`: MCP 서버 설정
  - `Tool`: AI 도구의 정의 (ID, 이름, 설정 경로 등)
  - `SyncStrategy`: 동기화 전략 인터페이스

### 2.2 Application Layer

- **역할**: 애플리케이션의 구체적인 유스케이스(Use Cases)를 구현합니다. 도메인 객체를 조작하여 사용자의 목표를 달성합니다.
- **구성 요소**:
  - `SyncRulesUseCase`: Rules 동기화 로직 오케스트레이션
  - `BackupUseCase`: 백업 생성 및 관리
  - `RestoreHistoryUseCase`: 히스토리 복원
- **특징**: 트랜잭션 관리, 로깅, 도메인 이벤트 발행 등을 담당합니다.

### 2.3 Interface Adapters Layer

- **역할**: 외부 세계(CLI, Web, DB)와 애플리케이션 내부 간의 데이터를 변환합니다.
- **구성 요소**:
  - `FileRepository`: 파일 시스템 접근 추상화 구현체
  - `GitRepository`: Git 명령 실행 추상화 구현체
  - `CliController`: CLI 명령어 입력을 유스케이스 입력으로 변환
  - `CliPresenter`: 유스케이스 결과를 CLI 출력 형식으로 변환

### 2.4 Infrastructure Layer

- **역할**: 세부 기술적인 구현 사항입니다.
- **구성 요소**:
  - `Node.js fs module`
  - `simple-git`
  - `commander` (CLI Framework)
  - `inquirer`

## 3. Implementation Strategy (Refactoring)

현재의 절차적 코드베이스를 위 아키텍처로 점진적으로 리팩토링합니다.

### 3.1 Dependency Injection (DI)

- 클래스 간의 결합도를 낮추기 위해 생성자 주입(Constructor Injection)을 사용합니다.
- DI 컨테이너(예: InversifyJS 또는 자체 구현)를 도입하여 의존성을 관리합니다.

### 3.2 Repository Pattern

- 파일 시스템 접근 로직(`fs.readFileSync` 등)을 `Repository` 인터페이스 뒤로 숨깁니다.
- 이를 통해 테스트 시 파일 시스템을 Mocking하기 쉬워집니다.

### 3.3 Strategy Pattern

- 동기화 전략(Overwrite, Merge, Smart Update)을 Strategy 패턴으로 구현하여 OCP를 준수합니다.
- 새로운 전략 추가 시 기존 코드를 수정할 필요가 없습니다.

## 4. 현재 구현된 디렉토리 구조

```text
packages/cli/src/
├── use-cases/           # Use Case Layer (비즈니스 로직)
│   ├── IUseCase.ts      # Use Case 기본 인터페이스
│   ├── rules/           # Rules 관련 Use Cases
│   │   ├── RulesDTOs.ts
│   │   ├── SyncRulesToToolUseCase.ts
│   │   ├── SyncRulesToAllToolsUseCase.ts
│   │   └── LoadMasterRulesUseCase.ts
│   └── mcp/             # MCP 관련 Use Cases
│       ├── McpDTOs.ts
│       ├── SyncMcpToToolUseCase.ts
│       ├── SyncMcpToAllToolsUseCase.ts
│       └── LoadMasterMcpUseCase.ts
├── interfaces/          # 인터페이스 정의 (DIP 적용)
│   ├── IFileSystem.ts   # 파일 시스템 추상화
│   ├── IDatabase.ts     # 데이터베이스 추상화 (NEW)
│   ├── IRulesService.ts # Rules 서비스 인터페이스
│   ├── ISyncService.ts  # Sync 서비스 인터페이스
│   ├── IMcpService.ts   # MCP 서비스 인터페이스 (NEW)
│   └── repositories/    # Repository 인터페이스
│       ├── IRulesConfigRepository.ts
│       ├── ISyncConfigRepository.ts
│       └── IGlobalConfigRepository.ts
├── infrastructure/      # 인프라 구현체
│   ├── NodeFileSystem.ts     # Node.js fs/path 구현
│   ├── SqliteDatabase.ts     # SQLite 데이터베이스 구현 (NEW)
│   ├── database.ts           # 데이터베이스 팩토리 (NEW)
│   ├── database-init.ts      # 스키마 초기화 (NEW)
│   ├── schema.ts             # 데이터베이스 스키마 (NEW)
│   └── repositories/         # Repository 구현체
│       ├── McpRepository.ts          # DB 기반 (MIGRATED)
│       ├── RulesConfigRepository.ts  # 파일 기반 (마이그레이션 예정)
│       ├── SyncConfigRepository.ts   # 파일 기반 (마이그레이션 예정)
│       └── GlobalConfigRepository.ts # 파일 기반 (마이그레이션 예정)
├── services/
│   ├── impl/            # 서비스 구현체
│   │   ├── RulesService.ts # IRulesService 구현
│   │   └── SyncService.ts  # ISyncService 구현
│   ├── rules.ts         # 어댑터 (기존 호환성 유지)
│   ├── sync.ts          # 어댑터 (기존 호환성 유지)
│   ├── strategies.ts    # 동기화 전략
│   ├── history.ts       # 버전 관리
│   └── scanner.ts       # 도구 탐지
├── utils/               # 유틸리티
│   ├── backup.ts        # 백업 유틸
│   └── validation.ts    # 데이터 검증
├── constants/           # 상수 정의
│   └── tools.ts         # 도구 메타데이터
└── schemas/             # 스키마 정의
    ├── rules.schema.ts
    └── mcp.schema.ts
```

## 5. 리팩토링 현황 (완료)

### 5.1 Phase 1: 인터페이스 및 DI 도입

1. **IFileSystem 인터페이스 도입**
   - 파일 시스템 접근을 추상화하여 테스트 용이성 향상
   - `NodeFileSystem` 구현체로 실제 fs/path 모듈 사용

2. **RulesService 클래스화**
   - `IRulesService` 인터페이스 정의
   - 의존성 주입(DI)을 통한 `IFileSystem` 사용
   - 기존 `rules.ts`를 어댑터 패턴으로 변경하여 하위 호환성 유지

3. **SyncService 클래스화**
   - `ISyncService` 인터페이스 정의
   - 의존성 주입(DI)을 통한 `IFileSystem` 사용
   - 기존 `sync.ts`를 어댑터 패턴으로 변경
   - 순환 의존성 문제 해결

### 5.2 Phase 2: Repository 패턴 적용

1. **Repository 패턴 구현**
   - `IRulesConfigRepository`: Rules 설정 파일 접근 추상화
   - `ISyncConfigRepository`: MCP 동기화 설정 파일 접근 추상화
   - `IGlobalConfigRepository`: 전역 설정 파일 접근 추상화
   - 각 Repository 구현체 작성

### 5.3 Phase 3: Use Case Layer 도입

1. **Use Case 패턴 구현**
   - `IUseCase<TRequest, TResponse>` 제네릭 인터페이스
   - Rules Use Cases: SyncRulesToTool, SyncRulesToAllTools, LoadMasterRules
   - MCP Use Cases: SyncMcpToTool, SyncMcpToAllTools, LoadMasterMcp
   - Request/Response DTO 타입 정의

### 5.4 테스트 커버리지

1. **단위 테스트 작성**
   - Services 테스트: RulesService, SyncService, McpService, HistoryService 등
   - Repository 테스트: RulesConfigRepository, SyncConfigRepository, GlobalConfigRepository, McpRepository
   - Use Cases 테스트: Rules/MCP 관련 6개 Use Cases
   - Utils 테스트: validation, backup
   - **총 31개 테스트 파일, 309개 테스트 통과** ✅

2. **E2E 테스트**
   - Rules 관리 E2E 테스트
   - MCP Sets/Definitions E2E 테스트
   - 네비게이션 테스트

## 6. 아키텍처 레이어 구조

```
┌─────────────────────────────────────┐
│     Use Cases (비즈니스 로직)        │
│  - SyncRulesToToolUseCase           │
│  - SyncMcpToAllToolsUseCase         │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│     Services (도메인 로직)           │
│  - RulesService                     │
│  - SyncService                      │
│  - McpService (DB 기반)             │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│   Repositories (데이터 접근)         │
│  - McpRepository (SQLite)           │
│  - RulesConfigRepository (파일)     │
│  - SyncConfigRepository (파일)      │
└──────────────┬──────────────────────┘
               │ depends on
┌──────────────▼──────────────────────┐
│  Infrastructure (저장소)             │
│  - SqliteDatabase (WAL 모드)        │
│  - NodeFileSystem                   │
│  - fs, path modules                 │
└─────────────────────────────────────┘
```

## 7. SOLID 원칙 적용 현황

- ✅ **SRP**: 각 클래스/Use Case가 단일 책임
- ✅ **OCP**: 전략 패턴으로 확장에 열려있음
- ✅ **LSP**: 인터페이스 기반 구현으로 치환 가능
- ✅ **ISP**: 역할별 인터페이스 분리 (IFileSystem, IRulesService, ISyncService 등)
- ✅ **DIP**: 의존성 역전 (Use Case → Service → Repository → Infrastructure)

## 8. 데이터베이스 레이어 (2024-12 추가)

### 8.1 SQLite 도입 배경

파일 기반 저장소의 문제점:
- 파일 경로 처리 오류 반복
- 동시성 문제 (race condition)
- 데이터 무결성 보장 어려움
- 관계형 데이터 관리 복잡성

### 8.2 구현 현황

- ✅ **McpRepository**: SQLite 기반으로 마이그레이션 완료
  - 트랜잭션 지원으로 데이터 무결성 보장
  - WAL 모드로 동시성 향상
  - 다대다 관계 (`mcp_set_items`) 관리 개선

- 🔄 **마이그레이션 예정**:
  - RulesConfigRepository
  - SyncConfigRepository
  - GlobalConfigRepository

### 8.3 데이터베이스 스키마

주요 테이블:
- `mcp_definitions`: MCP 서버 정의 (`is_archived` 포함)
- `mcp_sets`: MCP 서버 그룹 (`is_archived` 포함)
- `mcp_set_items`: Set과 Definition 간 다대다 관계
- `rules`: Rules 목록 (`is_archived` 포함)
- `schema_version`: 마이그레이션 버전 관리

자세한 내용은 `packages/cli/src/infrastructure/schema.ts` 참조

### 8.4 데이터 보관 정책 (Soft Delete)

**"모든 삭제는 실제로는 보관 상태입니다."**
- 시스템의 모든 데이터 삭제 작업은 **Soft Delete**로 처리됩니다.
- 레코드의 `is_archived` 컬럼을 `1`로 설정하여 삭제됨을 표시합니다.
- 조회 시에는 `is_archived = 0` 필터를 적용하여 활성 데이터만 반환합니다.
- 물리적 삭제(Hard Delete)는 특수한 경우(예: 개인정보 파기 요청, 시스템 정리 스크립트)를 제외하고는 수행하지 않습니다.

## 9. Web UI Layer (2024-12 추가)

### 9.1 기술 스택

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query (React Query)
- **Backend Runtime (Dual Mode)**:
  - **Development / Standalone API**: Express.js (`packages/api`)
  - **CLI Embedded**: Fastify (`packages/cli` via `acs ui` command)
- **Drag & Drop**: @dnd-kit

### 9.2 런타임 아키텍처 (Dual Runtime)

Web UI는 두 가지 방식으로 실행될 수 있습니다:

1.  **Standalone Mode (`acs ui`)**:
    - 일반 사용자를 위한 모드입니다.
    - CLI 패키지 내부에 **Fastify** 서버가 내장되어 있습니다.
    - 정적 빌드된 Frontend 파일(`packages/web/dist`)을 서빙하고 API 요청을 처리합니다.
    - 별도의 백엔드 프로세스 없이 단일 명령어로 실행됩니다.

2.  **Development Mode**:
    - 개발자를 위한 모드입니다.
    - **Express** 서버(`packages/api`)가 API를 담당하고, **Vite**가 Frontend를 서빙합니다.
    - HMR(Hot Module Replacement) 등 개발 편의 기능을 활용할 수 있습니다.

### 9.3 주요 컴포넌트 아키텍처

```
┌─────────────────────────────────────┐
│         Pages (페이지 레이어)         │
│  - McpPage, RulesPage, DashboardPage │
└──────────────┬──────────────────────┘
               │ uses
┌──────────────▼──────────────────────┐
│     Custom Hooks (상태 관리)          │
│  - useSortableList                   │
│  - useQuery / useMutation            │
└──────────────┬──────────────────────┘
               │ uses
┌──────────────▼──────────────────────┐
│     UI Components (재사용 컴포넌트)    │
│  - SortMenu, DragOverlay             │
│  - shadcn/ui components              │
└──────────────┬──────────────────────┘
               │ uses
┌──────────────▼──────────────────────┐
│     Utilities (유틸리티)              │
│  - getCommonSortableStyle            │
│  - cn (classname merge)              │
└─────────────────────────────────────┘
```

### 9.3 드래그 앤 드롭 패턴

`@dnd-kit` 라이브러리를 사용한 통합 드래그 앤 드롭 시스템:

1. **useSortableList Hook**: 정렬 + 드래그 앤 드롭 통합
   - `sortMode` nullable 패턴: 드래그 순서 변경 시 정렬 모드를 `null`로 설정
   - Optimistic Update + Rollback: API 실패 시 이전 상태로 복원
   - DragOverlay 지원: `activeItem`으로 드래그 중인 아이템 추적

2. **DragOverlay**: 부드러운 드래그 애니메이션
   - 원본 아이템: `opacity: 0` (숨김)
   - 드래그 중인 아이템: 별도 레이어에서 렌더링
   - 스타일: `border-primary/30 bg-muted/60 shadow-sm`

3. **센서 설정**:
   - PointerSensor: 150ms 딜레이 (클릭 vs 드래그 구분)
   - TouchSensor: 모바일 지원
   - KeyboardSensor: 접근성 지원

### 9.4 상태 관리 전략

- **서버 상태**: TanStack Query로 캐싱 및 자동 갱신
- **UI 상태**: React useState/useReducer
- **드래그 상태**: useSortableList 훅 내부에서 관리

자세한 내용은 `packages/web/README.md` 참조

## 10. 다음 단계

1. **데이터베이스 마이그레이션 완료**
   - 나머지 Repository를 SQLite로 전환
   - JSON → SQLite 자동 마이그레이션 도구 제공

2. ✅ **웹 UI 통합** (완료)
   - React 기반 웹 UI와 백엔드 API 연결
   - Tailwind CSS + shadcn/ui 디자인 적용
   - 드래그 앤 드롭 순서 변경 기능 구현

3. **문서화**
   - 사용자 가이드 작성
   - API 문서 작성

4. **배포 준비**
   - CI/CD 파이프라인 구축
   - 패키지 배포 준비
