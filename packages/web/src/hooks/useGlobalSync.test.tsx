import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useGlobalSync } from './useGlobalSync'
import * as api from '../lib/api'
import { useTargetStore } from '../store/targetStore'

// Mock API
vi.mock('../lib/api', () => ({
    fetchTools: vi.fn(),
    fetchMcpSets: vi.fn(),
    fetchRulesList: vi.fn(),
    executeRulesSync: vi.fn(),
    executeMcpSync: vi.fn(),
    getErrorMessage: (e: any) => e.message
}))

// Mock Store
vi.mock('../store/targetStore', () => ({
    useTargetStore: vi.fn()
}))

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
        }
    })
    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    )
}

describe('useGlobalSync', () => {
    const mockStore = {
        selectedRuleId: '',
        selectedMcpSetId: '',
        selectedToolIds: [],
        strategy: 'overwrite',
        mode: 'global',
        activeToolSetId: 'default'
    }

    beforeEach(() => {
        vi.clearAllMocks()
        vi.mocked(useTargetStore).mockReturnValue(mockStore as any)
    })

    it('should NOT be canSync when nothing is selected', async () => {
        vi.mocked(api.fetchMcpSets).mockResolvedValue([])
        vi.mocked(api.fetchTools).mockResolvedValue([])

        const { result } = renderHook(() => useGlobalSync(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.canSync).toBe(false))
    })

    it('should be valid when Rule is selected', async () => {
        vi.mocked(useTargetStore).mockReturnValue({
            ...mockStore,
            selectedRuleId: 'rule-1'
        } as any)
        vi.mocked(api.fetchMcpSets).mockResolvedValue([])

        const { result } = renderHook(() => useGlobalSync(), { wrapper: createWrapper() })

        // Even if mcpSets are empty, having a RuleID should allow sync
        await waitFor(() => expect(result.current.canSync).toBe(true))
    })

    it('should NOT be valid when MCP set is selected but invalid (not in fetched sets)', async () => {
        vi.mocked(useTargetStore).mockReturnValue({
            ...mockStore,
            selectedMcpSetId: 'stale-id'
        } as any)

        // Mock API returns list NOT containing 'stale-id'
        vi.mocked(api.fetchMcpSets).mockResolvedValue([
            { id: 'valid-id', name: 'Valid Set', items: [], isActive: true, createdAt: '', updatedAt: '' }
        ])

        const { result } = renderHook(() => useGlobalSync(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.canSync).toBe(false))
    })

    it('should be valid when MCP set is selected AND valid', async () => {
        vi.mocked(useTargetStore).mockReturnValue({
            ...mockStore,
            selectedMcpSetId: 'valid-id'
        } as any)

        vi.mocked(api.fetchMcpSets).mockResolvedValue([
            { id: 'valid-id', name: 'Valid Set', items: [], isActive: true, createdAt: '', updatedAt: '' }
        ])

        const { result } = renderHook(() => useGlobalSync(), { wrapper: createWrapper() })

        await waitFor(() => expect(result.current.canSync).toBe(true))
    })

    it('should NOT be valid while loading MCP sets', async () => {
        vi.mocked(useTargetStore).mockReturnValue({
            ...mockStore,
            selectedMcpSetId: 'valid-id'
        } as any)

        // Mock a loading promise that doesn't resolve immediately
        vi.mocked(api.fetchMcpSets).mockImplementation(() => new Promise(() => { }))

        const { result } = renderHook(() => useGlobalSync(), { wrapper: createWrapper() })

        // Should be false because isLoading is true
        // Note: react-query initial isLoading is true.
        expect(result.current.canSync).toBe(false)
    })
})
