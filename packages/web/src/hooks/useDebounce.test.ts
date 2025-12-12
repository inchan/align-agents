import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
    beforeEach(() => {
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.runOnlyPendingTimers()
        vi.useRealTimers()
    })

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('test', 300))
        expect(result.current).toBe('test')
    })

    it('should debounce value changes', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 300 } }
        )

        expect(result.current).toBe('initial')

        // Change value
        rerender({ value: 'updated', delay: 300 })
        expect(result.current).toBe('initial') // Still initial

        // Fast-forward time by 299ms
        act(() => {
            vi.advanceTimersByTime(299)
        })
        expect(result.current).toBe('initial') // Still initial

        // Fast-forward time by 1ms more (total 300ms)
        act(() => {
            vi.advanceTimersByTime(1)
        })
        expect(result.current).toBe('updated')
    })

    it('should cancel previous timeout on rapid changes', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: 'initial' } }
        )

        // Rapid changes
        rerender({ value: 'change1' })
        act(() => {
            vi.advanceTimersByTime(100)
        })
        rerender({ value: 'change2' })
        act(() => {
            vi.advanceTimersByTime(100)
        })
        rerender({ value: 'final' })

        // Should still be initial
        expect(result.current).toBe('initial')

        // After full delay from last change
        act(() => {
            vi.advanceTimersByTime(300)
        })
        expect(result.current).toBe('final')
    })

    it('should work with different data types', () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: { count: 0 } } }
        )

        expect(result.current).toEqual({ count: 0 })

        rerender({ value: { count: 5 } })
        act(() => {
            vi.advanceTimersByTime(300)
        })

        expect(result.current).toEqual({ count: 5 })
    })

    it('should respect custom delay', () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        )

        rerender({ value: 'updated', delay: 500 })

        // After 300ms - should still be initial
        act(() => {
            vi.advanceTimersByTime(300)
        })
        expect(result.current).toBe('initial')

        // After 500ms total - should be updated
        act(() => {
            vi.advanceTimersByTime(200)
        })
        expect(result.current).toBe('updated')
    })
})
