import { useState, useEffect } from 'react'

/**
 * Debounces a value with a specified delay
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value)

    useEffect(() => {
        // Set up timeout to update debounced value after delay
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        // Clean up timeout if value changes before delay completes
        return () => {
            clearTimeout(handler)
        }
    }, [value, delay])

    return debouncedValue
}
