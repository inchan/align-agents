# Development Guidelines & Methodology

이 문서는 AI CLI Syncer 프로젝트의 개발 방법론, 테스트 전략, 그리고 코딩 표준을 정의합니다. 우리는 **TDD(Test-Driven Development)**를 기본 개발 프로세스로 채택하여 코드의 품질과 신뢰성을 보장합니다.

## 1. TDD Workflow

모든 기능 구현과 버그 수정은 다음의 **Red-Green-Refactor** 사이클을 따릅니다.

### 1.1 Red (실패하는 테스트 작성)

- 구현하려는 기능의 요구사항을 정의하는 작은 단위 테스트를 먼저 작성합니다.
- 컴파일 에러나 테스트 실패를 확인합니다.
- **목표**: 무엇을 만들지 명확히 정의하고, 인터페이스를 설계합니다.

### 1.2 Green (테스트 통과)

- 테스트를 통과하기 위한 **최소한의 코드**만 작성합니다.
- 올바른 디자인이나 패턴보다는 "작동하는 것"에 집중합니다.
- **목표**: 기능을 빠르게 구현하여 요구사항을 충족시킵니다.

### 1.3 Refactor (리팩토링)

- 테스트가 통과하는 상태를 유지하면서 코드를 개선합니다.
- **중복 제거**, **가독성 향상**, **구조 개선(SOLID 적용)**을 수행합니다.
- **목표**: 기술 부채를 제거하고 유지보수하기 좋은 코드로 만듭니다.

## 2. Testing Strategy

우리는 **테스트 피라미드** 전략을 따릅니다.

### 2.1 Unit Tests (단위 테스트) - 70%

- **대상**: Domain Entities, Use Cases, Utility Functions
- **도구**: Vitest
- **실행**: `npm test`
- **특징**:
  - 외부 의존성(파일 시스템, 네트워크)은 철저히 **Mocking**합니다.
  - 실행 속도가 매우 빨라야 합니다.
  - 비즈니스 로직의 모든 분기를 커버해야 합니다.

### 2.2 Integration Tests (통합 테스트) - 20%

- **대상**: Repository Implementations, Adapters
- **특징**:
  - 실제 파일 시스템이나 Git과 상호작용하는 로직을 검증합니다.
  - 테스트용 임시 디렉토리나 샌드박스 환경을 사용합니다.

### 2.3 E2E Tests (시스템 테스트) - 10%

- **대상**: CLI Commands, Full Workflows
- **특징**:
  - 사용자의 관점에서 전체 시스템이 잘 작동하는지 검증합니다.
  - 실제 빌드된 CLI를 실행하여 테스트합니다.

## 3. Coding Standards

### 3.1 Naming Conventions

- **Classes/Interfaces**: PascalCase (e.g., `RulesService`, `ISyncStrategy`)
- **Functions/Variables**: camelCase (e.g., `syncRules`, `targetPath`)
- **Files**: kebab-case (e.g., `rules-service.ts`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `DEFAULT_CONFIG_PATH`)

### 3.2 TypeScript Best Practices

- `any` 타입 사용을 엄격히 금지합니다.
- 인터페이스를 사용하여 타입을 정의합니다.
- `null`과 `undefined`를 명확히 구분하여 처리합니다.
- `async/await`를 사용하여 비동기 로직을 처리합니다.

### 3.3 Error Handling

- 예외(Exception)는 예측 불가능한 에러에만 사용합니다.
- 비즈니스 로직의 실패는 `Result` 패턴이나 명시적인 반환 타입을 사용합니다.
- 모든 에러 메시지는 사용자에게 친절하고 명확해야 합니다.

## 5. 테스트 실행 방법

### 5.1 전체 테스트 실행

```bash
npm test
```

### 5.2 특정 파일 테스트

```bash
npm test -- packages/cli/src/services/__tests__/rules.test.ts
```

### 5.3 Watch 모드

```bash
npm test -- --watch
```

### 5.4 현재 테스트 현황

- **총 29개 테스트 통과** ✅
  - Services 테스트: 11개
  - Strategies 테스트: 6개
  - Use Cases 테스트: 7개
  - Backup 테스트: 5개

## 6. Use Case 개발 가이드

### 6.1 Use Case 구조

모든 Use Case는 `IUseCase<TRequest, TResponse>` 인터페이스를 구현해야 합니다.

```typescript
export class SyncRulesToToolUseCase implements IUseCase<SyncRulesToToolRequest, SyncRulesToToolResponse> {
    constructor(private rulesService: IRulesService) {}

    execute(request: SyncRulesToToolRequest): SyncRulesToToolResponse {
        // 비즈니스 로직 구현
    }
}
```

### 6.2 Use Case 작성 원칙

1. **단일 책임**: 하나의 Use Case는 하나의 비즈니스 기능만 담당
2. **의존성 주입**: 필요한 Service/Repository를 생성자로 주입
3. **DTO 사용**: Request/Response DTO로 입출력 타입 명확화
4. **에러 처리**: try-catch로 에러를 잡아 Response에 포함

### 6.3 Use Case 테스트 작성

```typescript
describe('SyncRulesToToolUseCase', () => {
    let useCase: SyncRulesToToolUseCase;
    let mockRulesService: IRulesService;

    beforeEach(() => {
        mockRulesService = {
            // 모든 메서드를 vi.fn()으로 모킹
        };
        useCase = new SyncRulesToToolUseCase(mockRulesService);
    });

    it('should successfully sync rules', () => {
        const response = useCase.execute(request);
        expect(response.success).toBe(true);
    });
});
```

## 7. Definition of Done (DoD)

다음 항목들이 모두 완료되어야 작업이 끝난 것으로 간주합니다.

- [ ] 모든 단위 테스트 통과 (커버리지 목표 달성)
- [ ] TDD 사이클 준수 확인
- [ ] 린트(Lint) 에러 없음
- [ ] 관련 문서 업데이트 완료
- [ ] 코드 리뷰 승인
