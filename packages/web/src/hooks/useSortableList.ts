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
    storageKey?: string;
}

export function useSortableList<T extends SortableItem>({
    items,
    onReorder,
    getName = (item) => (item as any).name || '',
    getCreatedAt = (item) => (item as any).createdAt || '',
    getUpdatedAt = (item) => (item as any).updatedAt || '',
    getOrderIndex = (item) => (item as any).orderIndex,
    initialSort = 'created',
    storageKey,
}: UseSortableListProps<T>) {
    const [sortMode, setSortModeState] = useState<SortMode>(() => {
        if (storageKey) {
            const saved = localStorage.getItem(storageKey);
            if (saved && ['a-z', 'created', 'updated', 'custom'].includes(saved)) {
                return saved as SortMode;
            }
        }
        return initialSort;
    });

    const setSortMode = (mode: SortMode) => {
        setSortModeState(mode);
        if (storageKey) {
            localStorage.setItem(storageKey, mode);
        }
    }

    const [localItems, setLocalItems] = useState<T[]>(items);

    // Sync local items with props items
    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const sortedItems = useMemo(() => {
        // Create a copy to sort
        const list = [...localItems];

        switch (sortMode) {
            case 'a-z':
                return list.sort((a, b) => getName(a).localeCompare(getName(b)));
            case 'created':
                return list.sort((a, b) => new Date(getCreatedAt(b)).getTime() - new Date(getCreatedAt(a)).getTime());
            case 'updated':
                return list.sort((a, b) => new Date(getUpdatedAt(b)).getTime() - new Date(getUpdatedAt(a)).getTime());
            case 'custom':
                // For custom sort, we rely on the order in localItems
                // If the items initially came from backend, they might not be sorted by orderIndex unless we ensure it
                // Ideally backend returns them sorted appropriately or we sort by orderIndex here if valid
                return list.sort((a, b) => {
                    const idxA = getOrderIndex(a) ?? Infinity;
                    const idxB = getOrderIndex(b) ?? Infinity;
                    return idxA - idxB;
                });
            default:
                return list;
        }
    }, [localItems, sortMode, getName, getCreatedAt, getUpdatedAt, getOrderIndex]);

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

        if (sortMode !== 'custom') return; // Should not happen if UI handles disabled state
        if (!over) return;

        if (active.id !== over.id) {
            setLocalItems((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                const newItems = arrayMove(items, oldIndex, newIndex);

                // Trigger callback
                if (onReorder) {
                    // Update order indices locally if we want to reflect immediately (though array order is enough for UI)
                    // The backend needs the list of IDs in the new order
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
        isDragEnabled: sortMode === 'custom'
    };
}
