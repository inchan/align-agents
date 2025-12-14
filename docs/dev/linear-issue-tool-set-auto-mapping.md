# Linear Issue: Tool Set 선택 시 Rules/MCP Set 자동 매핑 기능

## 📋 이슈 제목
**[Feature] Tool Set 선택 시 연결된 Rules/MCP Set 자동 선택**

---

## 📝 설명

### 현재 상태
SyncPage에서 Tool Set, Rules, MCP Set을 각각 독립적으로 선택해야 합니다. 현재 `syncStatus`를 기반으로 마지막 동기화 상태를 참조하여 자동 선택하려는 로직이 있으나, 이는 "동기화 이력 기반"이며 사용자가 원하는 "명시적 매핑 기반"이 아닙니다.

### 요청 기능
- **Tool Set을 선택하면** 해당 Tool Set에 연결된 Rules와 MCP Set이 자동으로 선택되어야 함
- **매핑이 없으면** "None" (선택안됨)이 기본값
- 명시적인 매핑 관계가 필요

---

## 🔍 기술 조사 결과

### 현재 코드 구조

#### 1. SyncPage.tsx (packages/web/src/pages/SyncPage.tsx)
- 3컬럼 Kanban 보드 구조: Target Tools | Rules Source | MCP Server Set
- `useTargetStore`를 통한 상태 관리
- 현재 자동 선택 로직 (useEffect, 라인 ~239-295):
  ```typescript
  // Tool Set이 변경될 때만 실행 (useRef로 이전 값 추적)
  const prevToolSetIdRef = useRef<string | null>(null);

  useEffect(() => {
      if (store.activeToolSetId === prevToolSetIdRef.current) return;
      prevToolSetIdRef.current = store.activeToolSetId;
      // ...syncStatus 기반 자동 선택
  }, [store.activeToolSetId, syncStatus, ...]);
  ```
  - 현재 로직은 "SyncStatus"(마지막 동기화 상태)를 기반으로 추론합니다.
  - Tool Set 변경 시에만 실행됩니다 (폴링 제거됨, 사용자 수동 선택 유지).
  - 명시적인 매핑(Tool Set -> Rule/MCP) 설정은 없습니다.

#### 2. targetStore.ts (packages/web/src/store/targetStore.ts)
```typescript
interface TargetState {
    activeToolSetId: string
    selectedRuleId: string | null
    selectedMcpSetId: string | null
    // ...
}
```

#### 3. ToolSet 타입 (SyncPage.tsx 내부 정의)
```typescript
interface ToolSet {
    id: string
    name: string
    description: string
    toolIds: string[]
    isDefault: boolean
    type?: 'all' | 'cli' | 'ide' | 'desktop'
}
```
- 현재 `linkedRuleId`, `linkedMcpSetId` 같은 매핑 필드가 **없음**

---

## 💡 제안하는 해결 방안

### Option A: ToolSet에 매핑 필드 추가 (권장)

#### 1. ToolSet 인터페이스 확장
```typescript
interface ToolSet {
    id: string
    name: string
    description: string
    toolIds: string[]
    isDefault: boolean
    type?: 'all' | 'cli' | 'ide' | 'desktop'
    // 신규 필드
    linkedRuleId?: string | null      // 연결된 Rule ID
    linkedMcpSetId?: string | null    // 연결된 MCP Set ID
}
```

#### 2. 자동 선택 로직 수정
```typescript
// SyncPage.tsx - Tool Set 선택 시
useEffect(() => {
    if (activeSet) {
        // 명시적 매핑이 있으면 해당 ID 사용, 없으면 null (None)
        const targetRuleId = activeSet.linkedRuleId ?? null;
        const targetMcpSetId = activeSet.linkedMcpSetId ?? null;
        
        store.setSelectedRuleId(targetRuleId);
        store.setSelectedMcpSetId(targetMcpSetId);
    }
}, [activeSet?.id]);
```

#### 3. UI에서 매핑 설정 기능 추가
- Tool Set 생성/수정 다이얼로그에 "연결할 Rule"과 "연결할 MCP Set" 선택 옵션 추가
- 또는 각 컬럼에서 드래그앤드롭으로 연결

### Option B: 별도 매핑 테이블 관리

```typescript
interface ToolSetMapping {
    toolSetId: string
    ruleId: string | null
    mcpSetId: string | null
}

// LocalStorage 또는 API로 관리
const [mappings, setMappings] = useLocalStorage<ToolSetMapping[]>('tool-set-mappings', [])
```

---

## 📌 수정해야 할 파일

1. **packages/web/src/pages/SyncPage.tsx**
   - ToolSet 인터페이스에 linkedRuleId, linkedMcpSetId 추가
   - 자동 선택 useEffect 로직 수정
   - Tool Set 생성 다이얼로그에 연결 옵션 추가

2. **packages/web/src/store/targetStore.ts** (선택사항)
   - 매핑 정보를 중앙 store에서 관리할 경우

3. **packages/api/** (선택사항)
   - 매핑 정보를 서버 측에서 영속화할 경우

---

## ✅ 수용 기준 (Acceptance Criteria)

1. [ ] Tool Set 선택 시 연결된 Rule이 자동 선택됨
2. [ ] Tool Set 선택 시 연결된 MCP Set이 자동 선택됨
3. [ ] 연결이 없는 Tool Set 선택 시 "None"이 기본 선택됨
4. [ ] Tool Set 생성/수정 시 Rule과 MCP Set 연결 가능
5. [ ] 연결 정보가 LocalStorage에 영속화됨

---

## 🏷️ 라벨
- `feature`
- `web-ui`
- `sync`

## 📊 우선순위
Medium

## 🎯 관련 컴포넌트
- SyncPage
- targetStore
- ToolSet
