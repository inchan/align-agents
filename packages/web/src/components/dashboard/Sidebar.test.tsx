import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { describe, it, expect } from 'vitest'

describe('Sidebar', () => {
    it('renders navigation links', () => {
        render(
            <MemoryRouter>
                <Sidebar />
            </MemoryRouter>
        )

        expect(screen.getByText('Rules')).toBeInTheDocument()
        expect(screen.getByText('MCP')).toBeInTheDocument()
        expect(screen.getByText('Settings')).toBeInTheDocument()
    })

    it('highlights active link', () => {
        render(
            <MemoryRouter initialEntries={['/rules']}>
                <Sidebar />
            </MemoryRouter>
        )

        const rulesLink = screen.getByText('Rules').closest('a')
        expect(rulesLink).toHaveClass('text-primary-foreground')
    })
})
