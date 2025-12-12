import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type TargetMode = 'global' | 'project'

interface TargetState {
    mode: TargetMode
    projectPath: string | null
    projectName: string | null
    customProjects: { path: string; name: string; source: 'manual' }[]

    strategy: string
    selectedToolIds: string[]
    selectedRuleId: string | null
    selectedMcpSetId: string | null

    setTarget: (mode: TargetMode, path?: string | null, name?: string | null) => void
    setStrategy: (strategy: string) => void
    setSelectedToolIds: (ids: string[]) => void
    setSelectedRuleId: (id: string | null) => void
    setSelectedMcpSetId: (id: string | null) => void

    addCustomProject: (path: string, name: string) => void
    removeCustomProject: (path: string) => void
    activeToolSetId: string
    setActiveToolSetId: (id: string) => void
    validateAndClearSelection: (validMcpSetIds: string[], validRuleIds?: string[]) => void
}

export const useTargetStore = create<TargetState>()(
    persist(
        (set, get) => ({
            mode: 'global',
            projectPath: null,
            projectName: null,
            customProjects: [],
            strategy: 'overwrite',

            selectedToolIds: ['all'],
            selectedRuleId: null,
            selectedMcpSetId: null,
            activeToolSetId: 'all',

            setTarget: (mode, path = null, name = null) => set({
                mode,
                projectPath: path,
                projectName: name
            }),

            setStrategy: (strategy) => {
                console.log(`[Web] targetStore: setStrategy called with ${strategy}`);
                set({ strategy });
            },

            setSelectedToolIds: (ids) => set({ selectedToolIds: ids }),
            setSelectedRuleId: (id) => set({ selectedRuleId: id }),
            setSelectedMcpSetId: (id) => set({ selectedMcpSetId: id }),
            validateAndClearSelection: (validMcpSetIds, validRuleIds) => {
                const { selectedMcpSetId, selectedRuleId } = get()

                // Validate MCP Set
                if (selectedMcpSetId && validMcpSetIds.length > 0) {
                    const isValid = validMcpSetIds.includes(selectedMcpSetId)
                    if (!isValid) {
                        console.warn('[Store] Invalid MCP Set ID detected, clearing:', selectedMcpSetId)
                        set({ selectedMcpSetId: null })
                    }
                }

                // Validate Rule
                if (selectedRuleId && validRuleIds && validRuleIds.length > 0) {
                    const isValid = validRuleIds.includes(selectedRuleId)
                    if (!isValid) {
                        console.warn('[Store] Invalid Rule ID detected, clearing:', selectedRuleId)
                        set({ selectedRuleId: null })
                    }
                }
            },

            setActiveToolSetId: (id) => set({ activeToolSetId: id }),

            addCustomProject: (path, name) => set((state) => {
                // Prevent duplicates
                if (state.customProjects.some(p => p.path === path)) return state
                return {
                    customProjects: [...state.customProjects, { path, name, source: 'manual' }]
                }
            }),

            removeCustomProject: (path) => set((state) => ({
                customProjects: state.customProjects.filter(p => p.path !== path)
            }))
        }),
        {
            name: 'sync-target-storage', // unique name for localStorage
        }
    )
)
