# @align-agents/web

align-agents 프로젝트의 웹 UI 패키지입니다.

## 기술 스택

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- **State Management**: TanStack Query (React Query)
- **Routing**: React Router

## 주요 기능

### MCP 관리 (McpPage)
- MCP Sets 생성/편집/삭제
- MCP Library (Definitions) 관리
- 드래그 앤 드롭으로 순서 변경

### Rules 관리 (RulesPage)
- Rules 생성/편집/삭제/활성화
- 드래그 앤 드롭으로 순서 변경

## 핵심 컴포넌트

### useSortableList Hook

드래그 앤 드롭과 정렬 기능을 통합한 커스텀 훅입니다.

```typescript
import { useSortableList } from '../hooks/useSortableList';

const {
    sortMode,        // 현재 정렬 모드 (null이면 사용자 정의 순서)
    setSortMode,     // 정렬 모드 변경
    sortedItems,     // 정렬된 아이템 목록
    handleDragStart, // 드래그 시작 핸들러
    handleDragEnd,   // 드래그 종료 핸들러
    handleDragCancel,// 드래그 취소 핸들러
    sensors,         // dnd-kit 센서 설정
    isDragEnabled,   // 드래그 활성화 여부
    activeId,        // 현재 드래그 중인 아이템 ID
    activeItem,      // 현재 드래그 중인 아이템 객체
} = useSortableList({
    items,                    // 아이템 배열
    onReorder,                // 순서 변경 콜백 (async)
    getName: (item) => item.name,
    getCreatedAt: (item) => item.createdAt,
    getUpdatedAt: (item) => item.updatedAt,
    initialSort: { type: 'created', direction: 'desc' },
    enableDragDrop: true,
});
```

#### 주요 특징

1. **DragOverlay 지원**: `activeItem`을 사용하여 드래그 중인 아이템의 시각적 피드백 제공
2. **정렬/드래그 통합**: 정렬 모드와 드래그 앤 드롭이 자연스럽게 연동
3. **Optimistic Update**: 드래그 완료 시 즉시 UI 반영, API 실패 시 롤백
4. **sortMode null 패턴**: 드래그로 순서 변경 후 `sortMode`가 `null`로 설정되어 사용자 정의 순서 유지

#### DragOverlay 사용 예시

```tsx
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

<DndContext
    sensors={sensors}
    onDragStart={handleDragStart}
    onDragEnd={handleDragEnd}
    onDragCancel={handleDragCancel}
>
    <SortableContext items={sortedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
        {sortedItems.map(item => (
            <SortableItem key={item.id} item={item} />
        ))}
    </SortableContext>

    <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
        {activeItem ? (
            <div className="border border-primary/30 bg-muted/60 shadow-sm">
                {/* 드래그 중인 아이템 UI */}
            </div>
        ) : null}
    </DragOverlay>
</DndContext>
```

### SortMenu 컴포넌트

정렬 옵션을 제공하는 드롭다운 메뉴입니다.

```tsx
import { SortMenu } from '../components/common/SortMenu';

<SortMenu
    currentSort={sortMode}      // SortMode | null
    onSortChange={setSortMode}  // (mode: SortMode | null) => void
/>
```

#### 정렬 옵션
- `a-z`: 이름순 (오름차순/내림차순)
- `created`: 생성일순 (오름차순/내림차순)
- `updated`: 수정일순 (오름차순/내림차순)

### getCommonSortableStyle 유틸리티

Sortable 아이템의 공통 스타일을 생성합니다.

```typescript
import { getCommonSortableStyle } from '../lib/utils';

const style = getCommonSortableStyle(transform, transition, isDragging);
// isDragging이 true면 opacity: 0 (DragOverlay가 대신 표시)
```

## 개발 환경 설정

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 린트
npm run lint
```

## 디렉토리 구조

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

## 스타일 가이드

### 드래그 앤 드롭 UI

- **드래그 중인 아이템**: `border-primary/30 bg-muted/60 shadow-sm`
- **원본 아이템**: `opacity: 0` (DragOverlay가 복제본을 표시)
- **센서 딜레이**: 150ms (클릭과 드래그 구분)
