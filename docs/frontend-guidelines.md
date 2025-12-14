# Frontend Development Guidelines

이 문서는 align-agents 웹 UI 패키지(`packages/web`)의 프론트엔드 개발 가이드라인을 정의합니다.

## 1. 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router

## 2. 드래그 앤 드롭 구현 패턴

`@dnd-kit` 라이브러리를 사용한 표준 구현 패턴입니다.

### 2.1 useSortableList Hook 사용

```typescript
import { useSortableList } from '../hooks/useSortableList';

const {
    sortedItems,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    sensors,
    activeItem,
    activeId,
    sortMode,
    setSortMode,
    isDragEnabled,
} = useSortableList({
    items,
    onReorder: async (ids) => { /* API 호출 */ },
    getName: (item) => item.name,
    getCreatedAt: (item) => item.createdAt,
    getUpdatedAt: (item) => item.updatedAt,
    initialSort: { type: 'created', direction: 'desc' },
    enableDragDrop: true,
});
```

### 2.2 DragOverlay 필수 사용

DragOverlay를 사용하여 부드러운 드래그 애니메이션을 제공합니다:

```tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

<DndContext
    sensors={sensors}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onDragCancel={handleDragCancel}
>
    <SortableContext
        items={sortedItems.map(i => i.id)}
        strategy={verticalListSortingStrategy}
    >
        {sortedItems.map(item => (
            <SortableItem key={item.id} item={item} />
        ))}
    </SortableContext>

    <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
        {activeItem ? (
            <div className="border border-primary/30 bg-muted/60 shadow-sm">
                {/* 드래그 중인 아이템 UI 복제 */}
            </div>
        ) : null}
    </DragOverlay>
</DndContext>
```

### 2.3 Sortable 아이템 스타일

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { getCommonSortableStyle } from '../lib/utils';

function SortableItem({ item }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.id,
    });

    const style = getCommonSortableStyle(transform, transition, isDragging);

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            {/* 아이템 내용 */}
        </div>
    );
}
```

### 2.4 스타일 가이드

| 상태 | 스타일 |
|------|--------|
| 드래그 중인 아이템 (DragOverlay) | `border border-primary/30 bg-muted/60 shadow-sm` |
| 원본 아이템 (드래그 중) | `opacity: 0` |
| 센서 딜레이 | 150ms (클릭과 드래그 구분) |

## 3. 정렬과 드래그 앤 드롭 통합

### 3.1 sortMode nullable 패턴

`sortMode`를 nullable로 처리하여 정렬과 드래그 앤 드롭을 통합합니다:

- **정렬 모드 활성**: `sortMode`가 `{ type, direction }` 형태
- **사용자 정의 순서**: 드래그 후 `sortMode`가 `null`로 설정

```typescript
// SortMenu에서 null 처리
<SortMenu
    currentSort={sortMode}  // SortMode | null
    onSortChange={setSortMode}
/>
```

### 3.2 정렬 옵션

- `a-z`: 이름순 (오름차순/내림차순)
- `created`: 생성일순 (오름차순/내림차순)
- `updated`: 수정일순 (오름차순/내림차순)

## 4. Optimistic Update 패턴

드래그 완료 시 즉시 UI를 업데이트하고, API 실패 시 롤백합니다:

```typescript
const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    // 이전 상태 저장 (롤백용)
    const prevItems = [...localItems];
    const prevSortMode = sortMode;

    // 새 순서 계산
    const oldIndex = sortedItems.findIndex(item => item.id === active.id);
    const newIndex = sortedItems.findIndex(item => item.id === over.id);
    const newItems = arrayMove([...sortedItems], oldIndex, newIndex);

    // Optimistic Update
    setSortMode(null);  // 사용자 정의 순서 모드로 전환
    setLocalItems(newItems);

    try {
        await onReorder(newItems.map(item => item.id));
    } catch {
        // Rollback on error
        setLocalItems(prevItems);
        setSortMode(prevSortMode);
    }
};
```

## 5. 컴포넌트 작성 원칙

### 5.1 파일 구조

```
src/
├── components/
│   ├── common/          # 공통 컴포넌트 (SortMenu 등)
│   └── ui/              # shadcn/ui 컴포넌트
├── hooks/
│   └── useSortableList.ts  # 드래그 앤 드롭 + 정렬 훅
├── lib/
│   └── utils.ts         # 유틸리티 함수
├── pages/
│   ├── McpPage.tsx      # MCP 관리 페이지
│   └── RulesPage.tsx    # Rules 관리 페이지
└── ...
```

### 5.2 코딩 규칙

1. **재사용 가능한 훅**: 비즈니스 로직은 커스텀 훅으로 분리
2. **shadcn/ui 활용**: 기본 UI 컴포넌트는 shadcn/ui 사용
3. **Tailwind CSS**: 인라인 스타일 대신 Tailwind 클래스 사용
4. **TypeScript 필수**: Props 인터페이스 명시, `any` 금지

### 5.3 네이밍 컨벤션

- **컴포넌트**: PascalCase (e.g., `SortMenu`, `McpPage`)
- **훅**: camelCase with `use` prefix (e.g., `useSortableList`)
- **유틸리티 함수**: camelCase (e.g., `getCommonSortableStyle`)
- **상수**: UPPER_SNAKE_CASE (e.g., `DEFAULT_SORT`)

## 6. 상태 관리

### 6.1 서버 상태

TanStack Query를 사용하여 서버 상태를 관리합니다:

```typescript
const { data, isLoading, error } = useQuery({
    queryKey: ['mcpSets'],
    queryFn: () => api.getMcpSets(),
});

const mutation = useMutation({
    mutationFn: (data) => api.updateMcpSet(data),
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['mcpSets'] });
    },
});
```

### 6.2 UI 상태

React의 `useState`/`useReducer`를 사용하여 UI 상태를 관리합니다:

```typescript
const [isDialogOpen, setIsDialogOpen] = useState(false);
const [selectedItem, setSelectedItem] = useState<Item | null>(null);
```

### 6.3 드래그 상태

`useSortableList` 훅 내부에서 관리:

- `activeId`: 현재 드래그 중인 아이템 ID
- `activeItem`: 현재 드래그 중인 아이템 객체
- `localItems`: 로컬 아이템 목록 (optimistic update용)
