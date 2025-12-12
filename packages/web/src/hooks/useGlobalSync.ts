import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
    fetchTools,
    executeRulesSync,
    executeMcpSync,
    fetchMcpSets,
    fetchRulesList,
    type ToolConfig,
    type McpSet,
    type Rule
} from '../lib/api'
import { useTargetStore } from '../store/targetStore'
import { toast } from 'sonner'
import { getErrorMessage } from '../lib/utils'

// Debug 모드 체크 (localStorage 또는 URL 파라미터)
const isDebugMode = () => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem('debug') === 'true' ||
           new URLSearchParams(window.location.search).has('debug')
}

const debugLog = (message: string, data?: any) => {
    if (isDebugMode()) {
        console.log(`[useGlobalSync:DEBUG] ${message}`, data ?? '')
    }
}

// Define options interface
interface SyncOptions {
    scope?: 'rules' | 'mcp' | 'all'
    forceAllTools?: boolean
}

// Sync result tracking
interface SyncResult {
    rules?: { success: boolean; message?: string; skipped?: boolean }
    mcp?: { success: boolean; message?: string; skipped?: boolean; toolCount?: number }
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

    // fetch rules for validation
    const { data: rules = [] } = useQuery<Rule[]>({
        queryKey: ['rules'],
        queryFn: fetchRulesList,
        staleTime: 5 * 60 * 1000,
    })

    const syncMutation = useMutation<SyncResult, Error, SyncOptions | undefined>({
        mutationFn: async (options?: SyncOptions): Promise<SyncResult> => {
            const scope = options?.scope || 'all'
            const forceAllTools = options?.forceAllTools || false
            const result: SyncResult = {}

            debugLog('Sync started', {
                scope,
                forceAllTools,
                selectedRuleId: store.selectedRuleId,
                selectedMcpSetId: store.selectedMcpSetId,
                mcpSetsCount: mcpSets.length,
                rulesCount: rules.length
            })

            const rulesPromises: Promise<any>[] = []
            const mcpPromises: Promise<any>[] = []

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
            // Validate Selections First
            store.validateAndClearSelection(mcpSets.map(s => s.id), rules.map(r => r.id))

            // Sync Rules (global, not per-tool)
            if ((scope === 'all' || scope === 'rules') && store.selectedRuleId) {
                const ruleExists = rules.some(r => r.id === store.selectedRuleId)

                if (rules.length > 0 && !ruleExists) {
                    debugLog('Rule validation FAILED - ID not found in rules list', { selectedRuleId: store.selectedRuleId })
                    result.rules = { success: false, skipped: true, message: 'Selected Rule no longer exists' }
                } else {
                    const isGlobal = store.mode !== 'project';
                    debugLog('Rules sync starting', { ruleId: store.selectedRuleId, isGlobal })
                    rulesPromises.push(
                        executeRulesSync(
                            undefined,
                            store.selectedRuleId,
                            store.strategy,
                            isGlobal,
                            store.mode === 'project' ? (store.projectPath || undefined) : undefined
                        )
                    )
                }
            } else if (scope === 'rules' || scope === 'all') {
                result.rules = { success: true, skipped: true, message: 'No rule selected' }
            }

            // Sync MCP (per-tool)
            if ((scope === 'all' || scope === 'mcp') && store.selectedMcpSetId) {
                const mcpSetExists = mcpSets.find(s => s.id === store.selectedMcpSetId)

                if (mcpSets.length > 0 && !mcpSetExists) {
                    debugLog('MCP Set validation FAILED', { selectedMcpSetId: store.selectedMcpSetId })
                    store.validateAndClearSelection(mcpSets.map(s => s.id));
                    result.mcp = { success: false, skipped: true, message: 'Selected MCP Set no longer exists' }
                } else {
                    debugLog('MCP sync starting', {
                        mcpSetId: store.selectedMcpSetId,
                        toolCount: toolsToSync.length,
                        tools: toolsToSync
                    })

                    for (const toolId of toolsToSync) {
                        mcpPromises.push(executeMcpSync(toolId, store.selectedMcpSetId, store.strategy, global, targetPath || undefined))
                    }
                }
            } else if (scope === 'mcp' || scope === 'all') {
                result.mcp = { success: true, skipped: true, message: 'No MCP set selected' }
            }

            const allPromises = [...rulesPromises, ...mcpPromises]

            if (allPromises.length === 0) {
                if (scope === 'rules' && !store.selectedRuleId) {
                    throw new Error("No rule selected for rules sync")
                }
                if (scope === 'mcp' && !store.selectedMcpSetId) {
                    throw new Error("No MCP set selected for MCP sync")
                }
                if (!store.selectedRuleId && !store.selectedMcpSetId) {
                    throw new Error("No rules or MCP sets selected")
                }
                if (toolsToSync.length === 0 && !forceAllTools && !store.selectedToolIds.includes('all')) {
                    throw new Error("No valid tools selected to sync")
                }
            }

            // Execute Rules sync
            if (rulesPromises.length > 0) {
                try {
                    await Promise.all(rulesPromises)
                    result.rules = { success: true }
                    debugLog('Rules sync completed successfully')
                } catch (error) {
                    result.rules = { success: false, message: getErrorMessage(error) }
                    debugLog('Rules sync failed', { error: getErrorMessage(error) })
                }
            }

            // Execute MCP sync
            if (mcpPromises.length > 0) {
                try {
                    await Promise.all(mcpPromises)
                    result.mcp = { success: true, toolCount: mcpPromises.length }
                    debugLog('MCP sync completed successfully', { toolCount: mcpPromises.length })
                } catch (error) {
                    result.mcp = { success: false, message: getErrorMessage(error) }
                    debugLog('MCP sync failed', { error: getErrorMessage(error) })
                }
            }

            return result
        },
        onSuccess: (result) => {
            // Rules 결과 토스트
            if (result.rules) {
                if (result.rules.skipped) {
                    // 스킵된 경우는 토스트 표시 안함 (선택 안됨)
                } else if (result.rules.success) {
                    toast.success('Rules 동기화 완료')
                } else {
                    toast.error(`Rules 동기화 실패: ${result.rules.message}`)
                }
            }

            // MCP 결과 토스트
            if (result.mcp) {
                if (result.mcp.skipped) {
                    // 스킵된 경우는 토스트 표시 안함 (선택 안됨)
                } else if (result.mcp.success) {
                    const toolInfo = result.mcp.toolCount ? ` (${result.mcp.toolCount} tools)` : ''
                    toast.success(`MCP 동기화 완료${toolInfo}`)
                } else {
                    toast.error(`MCP 동기화 실패: ${result.mcp.message}`)
                }
            }

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

    return {
        sync: handleSync,
        isPending: syncMutation.isPending,
        canSync
    }
}
