import { useState, useMemo, useEffect } from 'react';
import type { SortMode } from '../components/common/SortMenu';
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    TouchSensor,
    type DragEndEvent,
    type DragStartEvent,
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
    arrayMove,
} from '@dnd-kit/sortable';

export interface SortableItem {
    id: string;
    [key: string]: any;
}

interface UseSortableListProps<T extends SortableItem> {
    items: T[];
    onReorder?: (ids: string[]) => Promise<void>;
    getName?: (item: T) => string;
    getCreatedAt?: (item: T) => string;
    getUpdatedAt?: (item: T) => string;
    getOrderIndex?: (item: T) => number | undefined;
    initialSort?: SortMode;
    enableDragDrop?: boolean;
}

const DEFAULT_SORT: SortMode = { type: 'created', direction: 'desc' };

export function useSortableList<T extends SortableItem>({
    items,
    onReorder,
    getName = (item) => (item as any).name || '',
    getCreatedAt = (item) => (item as any).createdAt || '',
    getUpdatedAt = (item) => (item as any).updatedAt || '',
    getOrderIndex = (item) => (item as any).orderIndex,
    initialSort = DEFAULT_SORT,
    enableDragDrop = false,
}: UseSortableListProps<T>) {
    const [sortMode, setSortMode] = useState<SortMode | null>(initialSort);
    const [localItems, setLocalItems] = useState<T[]>(items);
    const [activeId, setActiveId] = useState<string | null>(null);

    // Sync local items with props items
    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const sortedItems = useMemo(() => {
        // Create a copy to sort
        const list = [...localItems];

        // If sortMode is null (after drag reorder), return items as-is
        if (!sortMode) {
            return list;
        }

        const { type, direction } = sortMode;
        const multiplier = direction === 'asc' ? 1 : -1;

        switch (type) {
            case 'a-z':
                return list.sort((a, b) =>
                    multiplier * getName(a).localeCompare(getName(b))
                );
            case 'created':
                return list.sort((a, b) =>
                    multiplier * (new Date(getCreatedAt(a)).getTime() - new Date(getCreatedAt(b)).getTime())
                );
            case 'updated':
                return list.sort((a, b) =>
                    multiplier * (new Date(getUpdatedAt(a)).getTime() - new Date(getUpdatedAt(b)).getTime())
                );
            default:
                return list;
        }
    }, [localItems, sortMode, getName, getCreatedAt, getUpdatedAt]);

    // For drag and drop, we need sensors
    // Long press activation: 150ms delay to distinguish from click/scroll
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 150,
                tolerance: 5,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        setActiveId(null);

        if (!enableDragDrop) return;
        if (!over) return;

        if (active.id !== over.id) {
            // Use sortedItems for index calculation (matches what's displayed on screen)
            const oldIndex = sortedItems.findIndex((item) => item.id === active.id);
            const newIndex = sortedItems.findIndex((item) => item.id === over.id);
            const newItems = arrayMove([...sortedItems], oldIndex, newIndex);

            // Save previous state for rollback
            const prevItems = [...localItems];
            const prevSortMode = sortMode;

            // Clear sort mode to preserve user-defined order
            setSortMode(null);

            // Update local state (optimistic update)
            setLocalItems(newItems);

            // Trigger callback with rollback on error
            if (onReorder) {
                try {
                    await onReorder(newItems.map(item => item.id));
                } catch {
                    // Rollback on error
                    setLocalItems(prevItems);
                    setSortMode(prevSortMode);
                }
            }
        }
    };

    const handleDragCancel = () => {
        setActiveId(null);
    };

    // Get the currently dragged item for DragOverlay
    const activeItem = useMemo(() => {
        if (!activeId) return null;
        return sortedItems.find(item => item.id === activeId) || null;
    }, [activeId, sortedItems]);

    return {
        sortMode,
        setSortMode,
        sortedItems,
        handleDragStart,
        handleDragEnd,
        handleDragCancel,
        sensors,
        isDragEnabled: enableDragDrop,
        activeId,
        activeItem,
    };
}
