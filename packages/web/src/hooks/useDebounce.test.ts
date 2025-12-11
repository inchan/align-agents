import { renderHook, waitFor } from '@testing-library/react'
import { useDebounce } from './useDebounce'

describe('useDebounce', () => {
    beforeEach(() => {
        jest.useFakeTimers()
    })

    afterEach(() => {
        jest.runOnlyPendingTimers()
        jest.useRealTimers()
    })

    it('should return initial value immediately', () => {
        const { result } = renderHook(() => useDebounce('test', 300))
        expect(result.current).toBe('test')
    })

    it('should debounce value changes', async () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 300 } }
        )

        expect(result.current).toBe('initial')

        // Change value
        rerender({ value: 'updated', delay: 300 })
        expect(result.current).toBe('initial') // Still initial

        // Fast-forward time by 299ms
        jest.advanceTimersByTime(299)
        expect(result.current).toBe('initial') // Still initial

        // Fast-forward time by 1ms more (total 300ms)
        jest.advanceTimersByTime(1)
        await waitFor(() => {
            expect(result.current).toBe('updated')
        })
    })

    it('should cancel previous timeout on rapid changes', async () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: 'initial' } }
        )

        // Rapid changes
        rerender({ value: 'change1' })
        jest.advanceTimersByTime(100)
        rerender({ value: 'change2' })
        jest.advanceTimersByTime(100)
        rerender({ value: 'final' })

        // Should still be initial
        expect(result.current).toBe('initial')

        // After full delay from last change
        jest.advanceTimersByTime(300)
        await waitFor(() => {
            expect(result.current).toBe('final')
        })
    })

    it('should work with different data types', async () => {
        const { result, rerender } = renderHook(
            ({ value }) => useDebounce(value, 300),
            { initialProps: { value: { count: 0 } } }
        )

        expect(result.current).toEqual({ count: 0 })

        rerender({ value: { count: 5 } })
        jest.advanceTimersByTime(300)

        await waitFor(() => {
            expect(result.current).toEqual({ count: 5 })
        })
    })

    it('should respect custom delay', async () => {
        const { result, rerender } = renderHook(
            ({ value, delay }) => useDebounce(value, delay),
            { initialProps: { value: 'initial', delay: 500 } }
        )

        rerender({ value: 'updated', delay: 500 })

        // After 300ms - should still be initial
        jest.advanceTimersByTime(300)
        expect(result.current).toBe('initial')

        // After 500ms total - should be updated
        jest.advanceTimersByTime(200)
        await waitFor(() => {
            expect(result.current).toBe('updated')
        })
    })
})
