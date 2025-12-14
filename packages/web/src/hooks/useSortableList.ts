import { useState, useMemo, useEffect } from 'react';
import type { SortMode } from '../components/common/SortMenu';
import {
    useSensor,
    useSensors,
    PointerSensor,
    KeyboardSensor,
    TouchSensor,
    type DragEndEvent,
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
    const [sortMode, setSortMode] = useState<SortMode>(initialSort);

    const [localItems, setLocalItems] = useState<T[]>(items);

    // Sync local items with props items
    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const sortedItems = useMemo(() => {
        // Create a copy to sort
        const list = [...localItems];
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
    // Long press activation: 300ms delay to distinguish from click/scroll
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 5,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 300,
                tolerance: 5,
            },
        })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;

        if (!enableDragDrop) return;
        if (!over) return;

        if (active.id !== over.id) {
            setLocalItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger callback
                if (onReorder) {
                    onReorder(newItems.map(item => item.id));
                }

                return newItems;
            });
        }
    };

    return {
        sortMode,
        setSortMode,
        sortedItems,
        handleDragEnd,
        sensors,
        isDragEnabled: enableDragDrop
    };
}
