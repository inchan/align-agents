import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown): string {
    if (typeof error === 'string') return error

    // Handle API error response format from @align-agents/errors
    if (typeof error === 'object' && error !== null) {
        // Direct API error format: { code, message, details }
        if ('code' in error && 'message' in error) {
            return (error as { message: string }).message
        }

        // Axios-style response: error.response.data.error.message
        if ('response' in error) {
            const response = (error as { response?: { data?: { error?: { message?: string }, message?: string } } }).response
            if (response?.data?.error?.message) return response.data.error.message
            if (response?.data?.message) return response.data.message
        }

        // Standard Error object
        if ('message' in error) {
            return (error as Error).message
        }
    }

    return '알 수 없는 오류가 발생했습니다.'
}

import { CSS } from '@dnd-kit/utilities'
import type { Transform } from '@dnd-kit/utilities'

export function getCommonSortableStyle(transform: Transform | null, transition: string | undefined, isDragging: boolean) {
    return {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as const,
        touchAction: 'none'
    }
}
