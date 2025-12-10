import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error
    if (typeof error === 'object' && error !== null && 'response' in error && typeof (error as any).response === 'object' && (error as any).response !== null && 'data' in (error as any).response && typeof ((error as any).response as any).data === 'object' && ((error as any).response as any).data !== null && 'message' in ((error as any).response as any).data) return ((error as any).response as any).data.message
    if (typeof error === 'object' && error !== null && 'message' in error) return (error as Error).message
    return '알 수 없는 오류가 발생했습니다.'
}

import { CSS } from '@dnd-kit/utilities'
import type { Transform } from '@dnd-kit/utilities'

export function getCommonSortableStyle(transform: Transform | null, transition: string | undefined, isDragging: boolean) {
    return {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as const,
        touchAction: 'none'
    }
}
