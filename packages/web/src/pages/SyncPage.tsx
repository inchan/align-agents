import { useState, useEffect, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
    fetchTools,
    fetchRulesList,
    fetchMcpSets,
    type ToolConfig,
    type Rule,
    type McpSet,
    type McpDef,
    fetchMcpPool,
    scanTools,
    type SyncStatus,
    fetchSyncStatus
} from '../lib/api'
import { cn } from '../lib/utils'
import {
    Check,
    FileText,
    Server,
    Monitor,
    Terminal,
    Code2,
    LayoutGrid,
    Plus,
    Trash2,
    Eye,
    Box,
    Layers
} from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { ScrollArea } from '../components/ui/scroll-area'
// Card and Separator imports removed
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { useTargetStore } from '../store/targetStore'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export function SyncPage() {
    const store = useTargetStore()

    // --- Data Fetching ---
    const { data: tools = [], isLoading: isToolsLoading } = useQuery<ToolConfig[]>({
        queryKey: ['tools'],
        queryFn: fetchTools,
    })

    const { data: rules = [], isLoading: isRulesLoading } = useQuery<Rule[]>({
        queryKey: ['rules'],
        queryFn: fetchRulesList,
    })

    const { data: mcpSets = [], isLoading: isMcpSetsLoading } = useQuery<McpSet[]>({
        queryKey: ['mcpSets'],
        queryFn: fetchMcpSets,
    })

    const { data: mcpPool = [] } = useQuery<McpDef[]>({
        queryKey: ['mcpPool'],
        queryFn: fetchMcpPool,
    })

    const { refetch: refetchTools } = useQuery<ToolConfig[]>({
        queryKey: ['tools'],
        queryFn: fetchTools,
    })

    // Loop protection
    const hasScannedRef = useRef(false);

    // Auto-scan if no tools found
    useEffect(() => {
        if (!isToolsLoading && tools.length === 0 && !hasScannedRef.current) {
            console.log('No tools found, triggering auto-scan...');
            hasScannedRef.current = true;
            scanTools()
                .then(() => {
                    refetchTools();
                })
                .catch(console.error);
        }
    }, [tools.length, isToolsLoading, refetchTools])

    // Sort tools logic
    // --- Types & Constants ---
    interface ToolSet {
        id: string
        name: string
        description: string
        toolIds: string[]
        isDefault: boolean
        type?: 'all' | 'cli' | 'ide' | 'desktop'
    }

    // Helper hook for LocalStorage
    function useLocalStorage<T>(key: string, initialValue: T) {
        const [storedValue, setStoredValue] = useState<T>(() => {
            try {
                const item = window.localStorage.getItem(key)
                return item ? JSON.parse(item) : initialValue
            } catch (error) {
                console.error(error)
                return initialValue
            }
        })
        const setValue = (value: T | ((val: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value
                setStoredValue(valueToStore)
                window.localStorage.setItem(key, JSON.stringify(valueToStore))
            } catch (error) {
                console.error(error)
            }
        }
        return [storedValue, setValue] as const
    }

    const getToolType = (tool: ToolConfig): 'desktop' | 'cli' | 'ide' => {
        const id = tool.id.toLowerCase()
        if (id.includes('desktop')) return 'desktop'
        if (id.includes('ide') || id.includes('cursor') || id.includes('vscode') || id.includes('windsurf') || id.includes('zed')) return 'ide'
        return 'cli'
    }

    // --- State ---
    const [customSets, setCustomSets] = useLocalStorage<ToolSet[]>('custom-tool-sets', [])
    const [isCreateSetOpen, setIsCreateSetOpen] = useState(false)
    const [newSetName, setNewSetName] = useState('')
    const [newSetDescription, setNewSetDescription] = useState('')
    const [newSetTools, setNewSetTools] = useState<string[]>([])

    // Collapsible states


    // --- Computed Data ---
    // --- Computed Data ---
    const defaultSets: ToolSet[] = useMemo(() => [
        { id: 'all', name: 'All Tools', description: 'Sync with all available tools', isDefault: true, toolIds: tools.filter(t => t.exists).map(t => t.id), type: 'all' as const },
        { id: 'cli', name: 'CLI Tools', description: 'Command line interfaces', isDefault: true, toolIds: tools.filter(t => t.exists && getToolType(t) === 'cli').map(t => t.id), type: 'cli' as const },
        { id: 'ide', name: 'IDEs', description: 'Integrated development environments', isDefault: true, toolIds: tools.filter(t => t.exists && getToolType(t) === 'ide').map(t => t.id), type: 'ide' as const },
        { id: 'desktop', name: 'Desktop Apps', description: 'GUI applications', isDefault: true, toolIds: tools.filter(t => t.exists && getToolType(t) === 'desktop').map(t => t.id), type: 'desktop' as const },
    ].filter(s => s.toolIds.length > 0), [tools])

    const menuSets = useMemo(() => [...defaultSets, ...customSets], [defaultSets, customSets])
    const activeSet = useMemo(() => menuSets.find(s => s.id === store.activeToolSetId) || defaultSets[0], [menuSets, store.activeToolSetId, defaultSets])

    // Initialize selection
    // Initialize selection - ensure it runs only when menuSets becomes available/ready
    // The previous code had `[menuSets.length]` which is odd but valid if we only care about length changes.
    // Linter suggests adding `store` and `menuSets` entirely.
    useEffect(() => {
        if (menuSets.length > 0 && !menuSets.find(s => s.id === store.activeToolSetId)) {
            store.setActiveToolSetId(menuSets[0]?.id || 'all')
        }
    }, [menuSets, store.activeToolSetId, store])

    // Update global store when active set changes
    useEffect(() => {
        if (activeSet) {
            const targetIds = activeSet.toolIds.length > 0 ? activeSet.toolIds : ['none']
            // Deep check to prevent infinite loop
            const isSame = store.selectedToolIds.length === targetIds.length &&
                store.selectedToolIds.every((id, idx) => id === targetIds[idx]) &&
                targetIds.every((id, idx) => id === store.selectedToolIds[idx]);

            if (!isSame) {
                store.setSelectedToolIds(targetIds)
            }
        }
    }, [activeSet, store.selectedToolIds, store])

    // --- Handlers ---
    const handleCreateSet = () => {
        if (!newSetName.trim()) return
        const newSet: ToolSet = {
            id: `custom-${Date.now()}`,
            name: newSetName,
            description: newSetDescription,
            toolIds: newSetTools,
            isDefault: false
        }
        setCustomSets([...customSets, newSet])
        setIsCreateSetOpen(false)
        setNewSetName('')
        setNewSetDescription('')
        setNewSetTools([])
    }

    const handleDeleteSet = (id: string) => {
        if (confirm('Are you sure you want to delete this set?')) {
            setCustomSets(customSets.filter(s => s.id !== id))
            if (store.activeToolSetId === id) {
                store.setActiveToolSetId('all')
            }
        }
    }

    const getSetIcon = (set: ToolSet) => {
        if (set.type === 'all') return <LayoutGrid className="w-4 h-4" />
        if (set.type === 'cli') return <Terminal className="w-4 h-4" />
        if (set.type === 'ide') return <Code2 className="w-4 h-4" />
        if (set.type === 'desktop') return <Monitor className="w-4 h-4" />
        return <LayoutGrid className="w-4 h-4" /> // Default custom icon
    }

    // --- Effects ---

    // Auto-selection of Rules and MCPs based on Tool Set (Last Successful Sync)
    // --- Effects ---

    // Fetch Sync Status
    const { data: syncStatus } = useQuery<SyncStatus>({
        queryKey: ['syncStatus'],
        queryFn: fetchSyncStatus,
        refetchInterval: 5000 // Poll every 5s for updates
    })

    // --- Unified Sync State Derivation ---
    // Priority: Data Integrity (Validation) > Auto-Detection > Persistence (Store)

    useEffect(() => {
        if (!syncStatus || !activeSet || !rules.length || !mcpSets.length || isMcpSetsLoading) return;

        // 1. Validation: specific checks for active selections
        // Ensure selectedMcpSetId exists in loaded sets
        if (store.selectedMcpSetId) {
            const exists = mcpSets.find(s => s.id === store.selectedMcpSetId);
            if (!exists) {
                console.warn(`[SyncPage] Selected McpSet ${store.selectedMcpSetId} not found. Clearing.`);
                store.setSelectedMcpSetId(null);
                // Trigger auto-selection in next render cycle by returning early?
                // No, we can fall through to auto-selection below if we reset it to null here.
                // However, state updates are batched. Better to calc new ID and set once.
            }
        }

        // 2. Auto-Selection Logic (Run if no valid selection exists OR explicitly re-evaluating)
        // We only run auto-selection if we don't have a valid selection (i.e. it was null or just cleared)
        // OR if the active tool set changes (dependency array).

        const currentSelectionValid = store.selectedMcpSetId && mcpSets.find(s => s.id === store.selectedMcpSetId);

        if (!currentSelectionValid) {
            const targetTools = activeSet.toolIds;
            if (targetTools.length === 0) return;

            // MCP Auto-Selection based on common servers
            const firstToolMcp = syncStatus.mcp[targetTools[0]];
            const commonServers = firstToolMcp?.servers;

            let resolvedMcpSetId: string | null = null;

            if (commonServers) {
                const allMatch = targetTools.every(tid => {
                    const conf = syncStatus.mcp[tid];
                    return conf && conf.servers &&
                        conf.servers.length === commonServers.length &&
                        conf.servers.every(s => commonServers.includes(s));
                });

                if (allMatch) {
                    const matchingSet = mcpSets.find(set => {
                        const getNames = (items: any[]) => items.map(i => (typeof i === 'string' ? i : i.name));
                        const setItems = getNames(set.items);
                        return setItems.length === commonServers.length && setItems.every(s => commonServers.includes(s));
                    });
                    if (matchingSet) resolvedMcpSetId = matchingSet.id;
                }
            }

            if (resolvedMcpSetId) {
                store.setSelectedMcpSetId(resolvedMcpSetId);
            } else {
                // If auto-detection fails, fallback to clearing (already null in this branch)
                store.setSelectedMcpSetId(null);
            }
        }

        // Rule Auto-Selection (Legacy/Fallback)
        // Keeping this separate or integrated?
        // Let's integrate for rules too: Validation > Persistence
        // Since we don't fully auto-detect rules from backend yet (no Rule ID in sync status), 
        // we just validate if selectedRuleId exists.
        if (store.selectedRuleId) {
            const ruleExists = rules.find(r => r.id === store.selectedRuleId);
            if (!ruleExists) {
                console.warn(`[SyncPage] Rule ${store.selectedRuleId} not found. Clearing.`);
                store.setSelectedRuleId(null);
            }
        } else {
            // Try to load legacy preference if store is empty
            const savedItem = window.localStorage.getItem('sync-selections')
            const savedSelections = savedItem ? JSON.parse(savedItem) : {}
            const saved = savedSelections[store.activeToolSetId]
            if (saved && saved.ruleId && rules.find(r => r.id === saved.ruleId)) {
                store.setSelectedRuleId(saved.ruleId)
            }
        }

    }, [store.activeToolSetId, syncStatus, rules, mcpSets, isMcpSetsLoading, activeSet]);

    // Placeholder for watchMode and isSyncing, handleSync, setWatchMode


    const isLoading = isToolsLoading || isRulesLoading || isMcpSetsLoading

    if (isLoading) return <LoadingState text="Loading sync configuration..." />

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background gap-6">
            {/* Dialogs */}
            <Dialog open={isCreateSetOpen} onOpenChange={setIsCreateSetOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Tool Set</DialogTitle>
                        <DialogDescription>
                            Create a custom group of tools to sync together.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name">Set Name</Label>
                            <Input
                                id="name"
                                value={newSetName}
                                onChange={(e) => setNewSetName(e.target.value)}
                                placeholder="e.g. My Favorite Tools"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                value={newSetDescription}
                                onChange={(e) => setNewSetDescription(e.target.value)}
                                placeholder="Briefly describe this set"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Included Tools</Label>
                            <ScrollArea className="h-[200px] border rounded-md p-2">
                                <div className="space-y-2">
                                    {tools.filter(t => t.exists).map(tool => (
                                        <div key={tool.id} className="flex items-center space-x-2 p-1 hover:bg-muted/50 rounded">
                                            <Checkbox
                                                id={`tool-${tool.id}`}
                                                checked={newSetTools.includes(tool.id)}
                                                onCheckedChange={(checked) => {
                                                    if (checked) {
                                                        setNewSetTools([...newSetTools, tool.id])
                                                    } else {
                                                        setNewSetTools(newSetTools.filter(id => id !== tool.id))
                                                    }
                                                }}
                                            />
                                            <Label htmlFor={`tool-${tool.id}`} className="flex-1 cursor-pointer flex items-center justify-between">
                                                <span>{tool.name}</span>
                                                <span className="text-xs text-muted-foreground capitalize">{getToolType(tool)}</span>
                                            </Label>
                                        </div>
                                    ))}
                                    {tools.filter(t => t.exists).length === 0 && (
                                        <div className="py-8">
                                            <EmptyState
                                                icon={Box}
                                                title="No Available Tools"
                                                description="No tools found in the project. Please configure tools first."
                                                className="py-0"
                                            />
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateSetOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSet} disabled={!newSetName.trim() || newSetTools.length === 0}>Create Set</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* Kanban Board */}
            <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
                {/* Column 1: Target Tools */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Monitor className="w-4 h-4 text-muted-foreground" />
                            Target Tools
                        </h3>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => {
                            setNewSetTools([])
                            setIsCreateSetOpen(true)
                        }}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-3">
                            {menuSets.map(set => (
                                <div
                                    key={set.id}
                                    onClick={() => store.setActiveToolSetId(set.id)}
                                    className={cn(
                                        "group relative px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer",
                                        store.activeToolSetId === set.id
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                            : "border-border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
                                    )}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-background border shadow-sm shrink-0 text-muted-foreground">
                                            {getSetIcon(set)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className={cn("font-medium text-sm truncate", store.activeToolSetId === set.id && "font-semibold")}>
                                                {set.name}
                                            </div>
                                            {set.description && (
                                                <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                                    {set.description}
                                                </div>
                                            )}
                                            <div className={cn("flex items-center gap-2", set.description ? "mt-2" : "mt-1")}>
                                                <div className="relative group/tooltip">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-background/50 border-input cursor-help">
                                                        {set.toolIds.length} tools
                                                    </Badge>
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block z-50 w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md animate-in fade-in zoom-in-95 duration-200">
                                                        <div className="font-semibold mb-1 pb-1 border-b">Included Tools:</div>
                                                        <ul className="space-y-0.5 mt-1">
                                                            {set.toolIds.slice(0, 5).map(id => {
                                                                const tool = tools.find(t => t.id === id);
                                                                return <li key={id} className="truncate text-muted-foreground">• {tool?.name || id}</li>
                                                            })}
                                                            {set.toolIds.length > 5 && <li className="text-muted-foreground italic pl-1">+{set.toolIds.length - 5} more...</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" align="start" onClick={(e) => e.stopPropagation()}>
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-medium leading-none mb-1">{set.name}</h4>
                                                        <p className="text-sm text-muted-foreground">{set.description}</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-muted-foreground uppercase">Included Tools ({set.toolIds.length})</div>
                                                        <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 bg-muted/50 rounded-md border text-sm">
                                                            {set.toolIds.map(id => {
                                                                const tool = tools.find(t => t.id === id)
                                                                return (
                                                                    <div key={id} className="flex items-center gap-2">
                                                                        <div className="w-1 h-1 rounded-full bg-primary/50" />
                                                                        <span className="truncate">{tool?.name || id}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                        {!set.isDefault && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleDeleteSet(set.id)
                                                }}
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                        {menuSets.length === 0 && (
                            <div className="h-full flex items-center justify-center p-4">
                                <EmptyState
                                    icon={Layers}
                                    title="No Tool Sets"
                                    description="No default or custom tool sets found. Create one to get started."
                                />
                            </div>
                        )}
                    </ScrollArea>
                </div>

                {/* Column 2: Rules */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 shrink-0">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            Rules Source
                        </h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-3">
                            <div
                                onClick={() => store.setSelectedRuleId(null)}
                                className={cn(
                                    "group relative px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-3",
                                    store.selectedRuleId === null
                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                        : "border-border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                    store.selectedRuleId === null ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
                                )}>
                                    {store.selectedRuleId === null && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">None</div>
                                    <div className="text-xs text-muted-foreground">Do not sync any rules</div>
                                </div>
                            </div>
                            {rules.map(rule => (
                                <div
                                    key={rule.id}
                                    onClick={() => store.setSelectedRuleId(rule.id)}
                                    className={cn(
                                        "group relative px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-3",
                                        store.selectedRuleId === rule.id
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                            : "border-border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
                                    )}
                                >
                                    <div className={cn(
                                        "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                        store.selectedRuleId === rule.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
                                    )}>
                                        {store.selectedRuleId === rule.id && <Check className="w-2.5 h-2.5" />}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{rule.name}</div>
                                        <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2 pr-6">{rule.content.slice(0, 60)}...</div>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-96" align="end" onClick={(e) => e.stopPropagation()}>
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-medium leading-none mb-1">{rule.name}</h4>
                                                        <div className="flex gap-2 text-xs text-muted-foreground font-mono mt-1">
                                                            <span className="bg-muted px-1.5 py-0.5 rounded">ID: {rule.id}</span>
                                                            <span className="bg-muted px-1.5 py-0.5 rounded">Last Modified: {new Date().toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-muted-foreground uppercase">Rule Content</div>
                                                        <ScrollArea className="h-[300px] w-full rounded-md border bg-muted/50 p-4">
                                                            <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed">
                                                                {rule.content}
                                                            </pre>
                                                        </ScrollArea>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>

                {/* Column 3: MCP Sets */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 shrink-0">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Server className="w-4 h-4 text-muted-foreground" />
                            MCP Server Set
                        </h3>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-4 space-y-3">
                            <div
                                onClick={() => store.setSelectedMcpSetId(null)}
                                className={cn(
                                    "group relative px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center gap-3",
                                    store.selectedMcpSetId === null
                                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                        : "border-border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                    store.selectedMcpSetId === null ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
                                )}>
                                    {store.selectedMcpSetId === null && <Check className="w-2.5 h-2.5" />}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">None</div>
                                    <div className="text-xs text-muted-foreground">Do not sync any MCP servers</div>
                                </div>
                            </div>
                            {mcpSets.map(set => (
                                <div
                                    key={set.id}
                                    onClick={() => store.setSelectedMcpSetId(set.id)}
                                    className={cn(
                                        "group relative px-4 py-3 rounded-lg border transition-all duration-200 cursor-pointer flex flex-col gap-2",
                                        store.selectedMcpSetId === set.id
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                            : "border-border bg-card hover:bg-muted/50 hover:border-primary/30 hover:shadow-sm"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={cn(
                                            "w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors",
                                            store.selectedMcpSetId === set.id ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/30"
                                        )}>
                                            {store.selectedMcpSetId === set.id && <Check className="w-2.5 h-2.5" />}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-medium text-sm flex items-center gap-2 min-w-0">
                                                <span className="truncate">{set.name}</span>
                                            </div>
                                            <div className="mt-2 flex items-center gap-2">
                                                <div className="relative group/tooltip">
                                                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal bg-background/50 border-input cursor-help">
                                                        {set.items.length} Servers
                                                    </Badge>
                                                    <div className="absolute left-0 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-popover text-popover-foreground text-xs rounded-md border shadow-md z-50">
                                                        <ul className="space-y-0.5">
                                                            {set.items.slice(0, 5).map((item, idx) => {
                                                                const server = mcpPool.find(s => s.id === item.serverId)
                                                                return <li key={idx} className="truncate">• {server?.name || item.serverId}</li>
                                                            })}
                                                            {set.items.length > 5 && <li className="text-muted-foreground italic pl-1">+{set.items.length - 5} more...</li>}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-muted-foreground hover:text-foreground"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                    }}
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-80" align="end" onClick={(e) => e.stopPropagation()}>
                                                <div className="space-y-3">
                                                    <div>
                                                        <h4 className="font-medium leading-none mb-1">{set.name}</h4>
                                                        <div className="flex gap-2 text-xs text-muted-foreground font-mono mt-1">
                                                            <span className="bg-muted px-1.5 py-0.5 rounded">ID: {set.id}</span>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <div className="text-xs font-medium text-muted-foreground uppercase">Included Servers ({set.items.length})</div>
                                                        <div className="max-h-[200px] overflow-y-auto space-y-1 p-2 bg-muted/50 rounded-md border text-sm">
                                                            {set.items.map((item, idx) => {
                                                                const server = mcpPool.find(s => s.id === item.serverId)
                                                                return (
                                                                    <div key={idx} className="flex items-center gap-2 font-mono text-xs">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
                                                                        <span className="truncate">{server?.name || item.serverId}</span>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div >
        </div >
    )
}
