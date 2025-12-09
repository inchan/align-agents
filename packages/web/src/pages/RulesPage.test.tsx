import { describe, it, expect, beforeAll } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { RulesPage } from './RulesPage'
import * as api from '../lib/api'
import { vi } from 'vitest'

// Mock API
vi.mock('../lib/api', () => ({
    fetchRulesList: vi.fn(),
    createRule: vi.fn(),
    updateRule: vi.fn(),
    deleteRule: vi.fn(),
    setActiveRule: vi.fn(),
    executeRulesSync: vi.fn(),
    fetchTools: vi.fn()
}))

// Mock dnd-kit
vi.mock('@dnd-kit/core', () => ({
    DndContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSensor: vi.fn(),
    useSensors: vi.fn(),
    PointerSensor: vi.fn(),
    closestCenter: vi.fn(),
}))

vi.mock('@dnd-kit/sortable', () => ({
    SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: vi.fn(),
        transform: null,
        transition: null,
        isDragging: false,
    }),
    verticalListSortingStrategy: vi.fn(),
    arrayMove: vi.fn(),
}))

vi.mock('@dnd-kit/utilities', () => ({
    CSS: {
        Transform: {
            toString: vi.fn(),
        },
    },
}))

const createWrapper = () => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    })

    return ({ children }: { children: React.ReactNode }) => (
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                {children}
            </MemoryRouter>
        </QueryClientProvider>
    )
}

describe.skip('RulesPage Integration', () => {
    beforeAll(() => {
        // Mock tools
        vi.mocked(api.fetchTools).mockResolvedValue([
            { id: 'cursor', name: 'Cursor', configPath: '/path/to/cursor', exists: true }
        ])
    })

    it('should display rules list', async () => {
        const mockRules = [
            {
                id: '1',
                name: 'Test Rule 1',
                content: '# Content 1',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Test Rule 2',
                content: '# Content 2',
                isActive: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ]

        vi.mocked(api.fetchRulesList).mockResolvedValue(mockRules)

        render(<RulesPage />, { wrapper: createWrapper() })

        await waitFor(() => {
            expect(screen.getByText('Test Rule 1')).toBeInTheDocument()
            expect(screen.getByText('Test Rule 2')).toBeInTheDocument()
        })
    })

    it('should show Master badge for active rule', async () => {
        const mockRules = [
            {
                id: '1',
                name: 'Active Rule',
                content: '# Content',
                isActive: true,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }
        ]

        vi.mocked(api.fetchRulesList).mockResolvedValue(mockRules)

        render(<RulesPage />, { wrapper: createWrapper() })

        await waitFor(() => {
            expect(screen.getByText('Master')).toBeInTheDocument()
        })
    })

    it('should display sync controls', async () => {
        vi.mocked(api.fetchRulesList).mockResolvedValue([])

        render(<RulesPage />, { wrapper: createWrapper() })

        await waitFor(() => {
            expect(screen.getByText('All')).toBeInTheDocument()
            expect(screen.getByText('Sync')).toBeInTheDocument()
        })
    })
})
