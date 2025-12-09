import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    fetchTools,
    executeRulesSync,
    executeMcpSync,
    fetchMcpSets,
    type ToolConfig,
    type McpSet
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

    // Validate MCP sets to prevent syncing with stale IDs
    // NOTE: queryKey must match other usages ('mcpSets') for proper cache invalidation
    const { data: mcpSets = [], isLoading: isLoadingMcpSets } = useQuery<McpSet[]>({
        queryKey: ['mcpSets'],
        queryFn: fetchMcpSets,
        staleTime: 5 * 60 * 1000,
    })

    const syncMutation = useMutation<any[], Error, SyncOptions | undefined>({
        mutationFn: async (options?: SyncOptions) => {
            const scope = options?.scope || 'all'
            const forceAllTools = options?.forceAllTools || false

            // DEBUG: Log mutation start state
            console.log('[useGlobalSync] mutationFn called:', {
                scope,
                forceAllTools,
                selectedRuleId: store.selectedRuleId,
                selectedMcpSetId: store.selectedMcpSetId,
                mcpSetsCount: mcpSets.length,
                mcpSetIds: mcpSets.map(s => s.id),
                isLoadingMcpSets
            })

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
                    console.log(`[Web] Syncing Rules for ${toolId}: strategy=${store.strategy}, global=${global}, target=${targetPath}`);
                    promises.push(executeRulesSync(toolId, store.selectedRuleId, store.strategy, global, targetPath || undefined))
                }

                // Sync MCP
                if ((scope === 'all' || scope === 'mcp') && store.selectedMcpSetId) {
                    // DEBUG: Log MCP sync validation
                    const mcpSetExists = mcpSets.find(s => s.id === store.selectedMcpSetId)
                    console.log('[useGlobalSync] MCP sync check:', {
                        toolId,
                        selectedMcpSetId: store.selectedMcpSetId,
                        mcpSetsLength: mcpSets.length,
                        mcpSetExists: !!mcpSetExists,
                        willValidate: mcpSets.length > 0
                    })

                    // Final validation before execution
                    if (mcpSets.length > 0 && !mcpSetExists) {
                        console.error('[useGlobalSync] MCP validation FAILED - throwing error')
                        throw new Error(`Invalid MCP Set ID: ${store.selectedMcpSetId}`)
                    }

                    if (mcpSets.length === 0) {
                        console.warn('[useGlobalSync] WARNING: mcpSets is empty, skipping validation!')
                    }

                    promises.push(executeMcpSync(toolId, store.selectedMcpSetId, store.strategy, global, targetPath || undefined))
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

    // Validation logic
    const isMcpSetValid = !store.selectedMcpSetId || mcpSets.some(set => set.id === store.selectedMcpSetId)
    // If we have an MCP ID but no sets loaded yet, we can't be sure, so better to wait or assume invalid until loaded.
    // However, if fetching fails, mcpSets might be empty.
    // Ideally: if selectedMcpSetId is present, we need to check if it's in the list.
    // If waiting for data, we can disable sync.

    // canSync conditions:
    // 1. Must have at least one of RuleID or McpID selected.
    // 2. If McpID is selected, it must be valid (exist in mcpSets).
    // 3. Not currently syncing.
    // 4. Not currently loading MCP sets (to ensure validation is correct).
    const canSync =
        (!!store.selectedRuleId || (!!store.selectedMcpSetId && isMcpSetValid)) &&
        !syncMutation.isPending &&
        !isLoadingMcpSets

    // DEBUG: Log canSync derivation
    console.log('[useGlobalSync] canSync derivation:', {
        selectedRuleId: store.selectedRuleId,
        selectedMcpSetId: store.selectedMcpSetId,
        isMcpSetValid,
        mcpSetsCount: mcpSets.length,
        isLoadingMcpSets,
        isPending: syncMutation.isPending,
        canSync
    })

    return {
        sync: handleSync,
        isPending: syncMutation.isPending,
        canSync
    }
}
