# 웹 UI 백엔드 API 구현 계획

## 목표

웹 UI와 CLI를 연결하는 백엔드 API 서버를 구현하여 브라우저에서 모든 기능을 사용할 수 있도록 합니다.

## 아키텍처 설계

### 기술 스택

- **프레임워크**: Express.js
- **언어**: TypeScript
- **포트**: 3001 (Vite dev server는 5173 사용 중)
- **비즈니스 로직**: 기존 Use Cases 재사용

### 디렉토리 구조

```
packages/
├── api/                    # 새로운 API 서버 패키지
│   ├── src/
│   │   ├── server.ts      # Express 서버 진입점
│   │   ├── routes/        # API 라우트
│   │   │   ├── tools.ts   # 도구 관련 API
│   │   │   ├── rules.ts   # Rules 관련 API
│   │   │   └── mcp.ts     # MCP 관련 API
│   │   ├── middleware/    # 미들웨어
│   │   │   ├── cors.ts
│   │   │   └── errorHandler.ts
│   │   └── controllers/   # 컨트롤러
│   │       ├── ToolsController.ts
│   │       ├── RulesController.ts
│   │       └── McpController.ts
│   ├── package.json
│   └── tsconfig.json
├── cli/                    # 기존 CLI 패키지
└── web/                    # 기존 웹 UI 패키지
```

## API 엔드포인트 설계

### 1. Tools API

```
GET    /api/tools              # 도구 목록 조회
GET    /api/tools/:id          # 특정 도구 정보 조회
POST   /api/tools/:id/scan     # 도구 재스캔
```

### 2. Rules API

```
GET    /api/rules              # Master Rules 조회
PUT    /api/rules              # Master Rules 업데이트
POST   /api/rules/sync         # Rules 동기화
  Body: {
    toolId?: string,          # 특정 도구 (없으면 전체)
    strategy?: 'overwrite' | 'merge' | 'smart-update'
  }
GET    /api/rules/config       # Rules 설정 조회
PUT    /api/rules/config       # Rules 설정 업데이트
```

### 3. MCP API

```
GET    /api/mcp                # Master MCP 조회
PUT    /api/mcp                # Master MCP 업데이트
POST   /api/mcp/sync           # MCP 동기화
  Body: {
    toolId?: string,
    serverIds?: string[]
  }
GET    /api/mcp/servers        # MCP 서버 목록
POST   /api/mcp/servers        # MCP 서버 추가
DELETE /api/mcp/servers/:id    # MCP 서버 삭제
```

### 4. History API

```
GET    /api/history            # 히스토리 목록
POST   /api/history/restore    # 히스토리 복원
  Body: {
    version: string
  }
```

## 구현 단계

### Phase 1: 프로젝트 설정

- [ ] `packages/api` 디렉토리 생성
- [ ] package.json 설정
- [ ] TypeScript 설정
- [ ] Express 서버 기본 구조

### Phase 2: 컨트롤러 구현

- [ ] ToolsController (Use Cases 활용)
- [ ] RulesController (Use Cases 활용)
- [ ] McpController (Use Cases 활용)

### Phase 3: 라우트 구현

- [ ] Tools 라우트
- [ ] Rules 라우트
- [ ] MCP 라우트
- [ ] History 라우트

### Phase 4: 미들웨어

- [ ] CORS 설정
- [ ] 에러 핸들링
- [ ] 요청 로깅

### Phase 5: 통합 및 테스트

- [ ] 웹 UI와 연동
- [ ] API 테스트
- [ ] 에러 케이스 검증

## Use Cases 재사용 전략

기존 CLI의 Use Cases를 그대로 활용하여 비즈니스 로직을 공유합니다.

```typescript
// 예시: RulesController
import { SyncRulesToAllToolsUseCase } from '@align-agents/cli/use-cases/rules';

class RulesController {
  async syncRules(req, res) {
    const useCase = new SyncRulesToAllToolsUseCase(rulesService);
    const result = useCase.execute({
      targetPath: req.body.targetPath,
      strategy: req.body.strategy
    });
    res.json(result);
  }
}
```

## CORS 설정

```typescript
app.use(cors({
  origin: 'http://localhost:5173', // Vite dev server
  credentials: true
}));
```

## 에러 핸들링

```typescript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});
```

## 예상 효과

1. **웹 UI 완전 기능화**: 브라우저에서 모든 CLI 기능 사용 가능
2. **코드 재사용**: Use Cases를 공유하여 중복 제거
3. **확장성**: 향후 다른 클라이언트(모바일 등) 지원 용이
4. **테스트 용이성**: API 레벨에서 독립적인 테스트 가능
