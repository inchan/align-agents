import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    fetchTools,
    executeRulesSync,
    executeMcpSync,
    type ToolConfig
} from '../lib/api'
import { useTargetStore } from '../store/targetStore'
import { toast } from 'sonner'
import { getErrorMessage } from '../lib/utils'

// Define options interface
interface SyncOptions {
    scope?: 'rules' | 'mcp' | 'all'
    forceAllTools?: boolean
}

export function useGlobalSync() {
    const queryClient = useQueryClient()
    const store = useTargetStore()

    // We need tools to know what 'all' means
    const { data: tools = [] } = useQuery<ToolConfig[]>({
        queryKey: ['tools'],
        queryFn: fetchTools,
        staleTime: 5 * 60 * 1000, // cache for 5 minutes
    })

    const syncMutation = useMutation<any[], Error, SyncOptions | undefined>({
        mutationFn: async (options?: SyncOptions) => {
            const scope = options?.scope || 'all'
            const forceAllTools = options?.forceAllTools || false

            const promises = []

            // Determine which tools to sync (only installed tools)
            let toolsToSync: (string | undefined)[]

            if (forceAllTools || store.selectedToolIds.includes('all')) {
                // Sync all installed tools (undefined usually signals "all" to the API, or iterate all)
                // If API supports undefined for "all", use that. 
                // Based on previous code: toolsToSync = [undefined] implies "all"
                toolsToSync = [undefined]
            } else {
                // Filter out tools that are not installed
                const installedToolIds = store.selectedToolIds.filter(id => {
                    const tool = tools.find(t => t.id === id)
                    return tool?.exists === true
                })
                toolsToSync = installedToolIds.length > 0 ? installedToolIds : []
            }

            // Determine target settings
            const global = store.mode === 'global'
            const targetPath = store.mode === 'project' ? store.projectPath : undefined

            if (store.mode === 'project' && !store.projectPath) {
                throw new Error("Project path is missing")
            }

            for (const toolId of toolsToSync) {
                // Sync Rules
                if ((scope === 'all' || scope === 'rules') && store.selectedRuleId) {
                    promises.push(executeRulesSync(toolId, store.selectedRuleId, store.strategy, global, targetPath || undefined))
                }

                // Sync MCP
                if ((scope === 'all' || scope === 'mcp') && store.selectedMcpSetId) {
                    promises.push(executeMcpSync(toolId, store.selectedMcpSetId, store.strategy))
                }
            }

            if (promises.length === 0) {
                if (scope === 'rules' && !store.selectedRuleId) {
                    throw new Error("No rule selected for rules sync")
                }
                if (scope === 'mcp' && !store.selectedMcpSetId) {
                    throw new Error("No MCP set selected for MCP sync")
                }
                if (!store.selectedRuleId && !store.selectedMcpSetId) {
                    throw new Error("No rules or MCP sets selected")
                }
                // Maybe toolsToSync is empty?
                if (toolsToSync.length === 0 && !forceAllTools && !store.selectedToolIds.includes('all')) {
                    throw new Error("No valid tools selected to sync")
                }
            }

            return Promise.all(promises)
        },
        onSuccess: () => {
            toast.success('Sync completed successfully')
            queryClient.invalidateQueries({ queryKey: ['tools'] })

            // Save last successful selection for auto-selection
            try {
                const savedItem = window.localStorage.getItem('sync-selections')
                const savedSelections = savedItem ? JSON.parse(savedItem) : {}

                savedSelections[store.activeToolSetId] = {
                    ruleId: store.selectedRuleId,
                    mcpId: store.selectedMcpSetId
                }

                window.localStorage.setItem('sync-selections', JSON.stringify(savedSelections))
            } catch (e) {
                console.error('Failed to save sync selection', e)
            }
        },
        onError: (error) => {
            toast.error(`Sync failed: ${getErrorMessage(error)}`)
        }
    })

    const handleSync = (options?: SyncOptions) => {
        if (!store.selectedRuleId && !store.selectedMcpSetId) return
        syncMutation.mutate(options)
    }

    return {
        sync: handleSync,
        isPending: syncMutation.isPending,
        canSync: (!!store.selectedRuleId || !!store.selectedMcpSetId) && !syncMutation.isPending
    }
}
