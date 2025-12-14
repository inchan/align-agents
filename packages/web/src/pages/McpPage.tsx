
// ... (Previous imports)
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchMcpSets, createMcpSet, updateMcpSet, reorderMcpSets,
    fetchMcpPool, createMcpDef, updateMcpDef, deleteMcpDef,
    type McpSet, type McpDef
} from '../lib/api'
import { useState, useEffect, useMemo, useRef } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { getErrorMessage, cn, getCommonSortableStyle } from '../lib/utils'
import { EnvEditor } from '../components/mcp/EnvEditor'
import {
    Plus, Trash2, Server, Layers,
    Box, Database, Folder, Search, MessageSquare, GitBranch, Globe,
    AlertTriangle, Import, Library, MoreVertical, Power, Edit, MinusCircle, Check, X,
    Eye, EyeOff
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { TruncateTooltip } from "@/components/ui/truncate-tooltip"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { DndContext, closestCenter, DragOverlay } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'

import { SortMenu } from '../components/common/SortMenu'
import { useSortableList } from '../hooks/useSortableList'
// import { useDebounce } from '../hooks/useDebounce' // Hidden for now (RB-43)

// --- Components ---

// Highlight search terms
function HighlightText({ text, query }: { text: string; query: string }) {
    if (!query.trim()) return <>{text}</>;

    try {
        const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

        return (
            <>
                {parts.map((part, i) =>
                    part.toLowerCase() === query.toLowerCase() ? (
                        <mark key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">
                            {part}
                        </mark>
                    ) : (
                        part
                    )
                )}
            </>
        );
    } catch {
        // If regex fails, return original text
        return <>{text}</>;
    }
}

interface SortableMcpSetItemProps {
    set: McpSet
    viewedSetId: string | null
    setViewedSetId: (id: string) => void
    handleDeleteClick: (id: string, name: string) => void
    isDragEnabled?: boolean
}

function SortableMcpSetItem({ set, viewedSetId, setViewedSetId, handleDeleteClick, isDragEnabled }: SortableMcpSetItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: set.id,
        disabled: !isDragEnabled
    })

    const style = getCommonSortableStyle(transform, transition, isDragging)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => setViewedSetId(set.id)}
            className={cn(
                "group relative px-3 py-3 rounded-lg border transition-all duration-200 cursor-pointer max-w-full touch-none",
                viewedSetId === set.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/60 hover:border-primary/30 hover:shadow-sm"
            )}
        >
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex-1 min-w-0 overflow-hidden">
                        <TruncateTooltip className={cn("font-medium text-sm transition-colors", viewedSetId === set.id ? "text-primary font-semibold" : "")}>
                            {set.name}
                        </TruncateTooltip>
                        {set.description && (
                            <TruncateTooltip className="text-xs text-muted-foreground mt-0.5">
                                {set.description}
                            </TruncateTooltip>
                        )}
                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] h-4 px-1">{set.items.length} Configured</Badge>
                        </div>
                    </div>
                </div>

                <div className={cn("shrink-0 ml-2 transition-opacity", viewedSetId === set.id ? "opacity-100" : "opacity-0 group-hover:opacity-100")}>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteClick(set.id, set.name);
                        }}
                        title="Archive Set"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// New Sortable Item for Inside Set
interface SortableSetItemProps {
    item: { serverId: string; disabled?: boolean }
    def: McpDef
    isDragEnabled: boolean
    onToggle: () => void
    onRemove: () => void
    onEdit: () => void
}

function SortableSetItem({ item, def, isDragEnabled, onToggle, onRemove, onEdit }: SortableSetItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.serverId,
        disabled: !isDragEnabled
    })

    const style = getCommonSortableStyle(transform, transition, isDragging)

    const isEnabled = !item.disabled

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group flex flex-col gap-2 p-3 rounded-lg border transition-all touch-none",
                item.disabled
                    ? "bg-muted/20 border-border/50 opacity-60 grayscale-[0.8]"
                    : "bg-card hover:bg-muted/50 border-border hover:shadow-sm"
            )}
        >
            <div className="flex items-start gap-2">
                <div className={cn(
                    "mt-0.5 shrink-0 w-8 h-8 rounded flex items-center justify-center transition-colors",
                    item.disabled ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                )}>
                    <McpIcon def={def} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <TruncateTooltip className={cn("font-medium text-sm", item.disabled && "text-muted-foreground line-through decoration-muted-foreground/50")}>
                                {def.name}
                            </TruncateTooltip>
                            {item.disabled && (
                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground bg-muted/50 border-muted-foreground/20 font-normal shrink-0">
                                    Disabled
                                </Badge>
                            )}
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2">
                                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={onToggle}>
                                    {isEnabled ? (
                                        <>
                                            <Power className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                                            <span>Disable</span>
                                        </>
                                    ) : (
                                        <>
                                            <Power className="w-3.5 h-3.5 mr-2 text-emerald-500" />
                                            <span>Enable</span>
                                        </>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onEdit}>
                                    <Edit className="w-3.5 h-3.5 mr-2" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={onRemove}
                                >
                                    <MinusCircle className="w-3.5 h-3.5 mr-2" />
                                    Remove
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                    <TruncateTooltip
                        className={cn("text-xs font-mono mt-1 px-1 py-0.5 rounded w-fit max-w-full", item.disabled ? "text-muted-foreground/70 bg-transparent p-0" : "text-muted-foreground bg-muted/50")}
                        contentClassName="font-mono text-xs"
                    >
                        {getMcpDefDisplayString(def)}
                    </TruncateTooltip>
                </div>
            </div>
        </div>
    )
}

// New Sortable Item for Library
interface SortableLibraryItemProps {
    def: McpDef & { isAssigned?: boolean }
    isDragEnabled: boolean
    selectedSetId: string | null
    searchQuery?: string
    onAddToSet: () => void
    onEdit: () => void
    onDelete: () => void
}

function SortableLibraryItem({ def, isDragEnabled, selectedSetId, searchQuery = '', onAddToSet, onEdit, onDelete }: SortableLibraryItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: def.id,
        disabled: !isDragEnabled
    })

    const style = getCommonSortableStyle(transform, transition, isDragging)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={cn(
                "group flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors touch-none",
                def.isAssigned ? "opacity-50" : ""
            )}
        >
            <div className="flex items-start gap-2">
                {selectedSetId && (
                    <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 -ml-1"
                        onClick={onAddToSet}
                        disabled={def.isAssigned}
                        title={def.isAssigned ? "Already in set" : "Add to Set"}
                    >
                        {def.isAssigned ? <Check className="w-4 h-4 text-emerald-500" /> : <Plus className="w-4 h-4" />}
                    </Button>
                )}
                <div className="mt-0.5 shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center text-primary">
                    <McpIcon def={def} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                        <TruncateTooltip className="font-medium text-sm" side="top">
                            <HighlightText text={def.name} query={searchQuery} />
                        </TruncateTooltip>
                    </div>
                    <TruncateTooltip
                        className="text-xs text-muted-foreground font-mono mt-1"
                        contentClassName="font-mono text-xs"
                        side="bottom"
                    >
                        <HighlightText text={getMcpDefDisplayString(def)} query={searchQuery} />
                    </TruncateTooltip>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <MoreVertical className="w-3 h-3" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {selectedSetId && !def.isAssigned && (
                            <>
                                <DropdownMenuItem onClick={onAddToSet}>
                                    <Plus className="w-3.5 h-3.5 mr-2" /> Add to Set
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                            </>
                        )}
                        <DropdownMenuItem onClick={onEdit}>
                            <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={onDelete}
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    )
}

// Helper to check if MCP def is HTTP type
function isHttpTypeDef(def: McpDef): boolean {
    return def.type === 'http' || def.type === 'sse' || (!!def.url && !def.command)
}

// Helper to get display string for MCP def (command + args or URL)
function getMcpDefDisplayString(def: McpDef): string {
    if (isHttpTypeDef(def)) {
        return def.url || ''
    }
    return [def.command, ...(def.args || [])].filter(Boolean).join(' ')
}

function getMcpIcon(name: string, command?: string, type?: string, url?: string) {
    const lowerName = name.toLowerCase()
    const lowerCmd = (command || '').toLowerCase()

    // HTTP/SSE type always shows Globe icon
    if (type === 'http' || type === 'sse' || (url && !command)) return <Globe className="w-4 h-4" />

    if (lowerName.includes('github') || lowerName.includes('git') || lowerCmd.includes('git')) return <GitBranch className="w-4 h-4" />
    if (lowerName.includes('file') || lowerName.includes('fs') || lowerCmd.includes('fs')) return <Folder className="w-4 h-4" />
    if (lowerName.includes('postgres') || lowerName.includes('sql') || lowerName.includes('db') || lowerName.includes('database')) return <Database className="w-4 h-4" />
    if (lowerName.includes('search') || lowerName.includes('brave') || lowerName.includes('google')) return <Search className="w-4 h-4" />
    if (lowerName.includes('slack') || lowerName.includes('discord') || lowerName.includes('chat')) return <MessageSquare className="w-4 h-4" />
    if (lowerName.includes('web') || lowerName.includes('http') || lowerName.includes('fetch')) return <Globe className="w-4 h-4" />

    return <Server className="w-4 h-4" />
}

function McpIcon({ def, className }: { def: McpDef, className?: string }) {
    const { name, command, args, type, url } = def

    let githubOwner = ''
    if (args) {
        for (const arg of args) {
            const match = arg.match(/(?:github\.com|ghcr\.io)[/:]([^/]+)/)
            if (match && match[1]) {
                githubOwner = match[1]
                break
            }
        }
    }

    const icon = getMcpIcon(name, command, type, url)

    if (!githubOwner) {
        return icon
    }

    return (
        <Avatar className={cn("w-full h-full rounded-md", className)}>
            <AvatarImage
                src={`https://github.com/${githubOwner}.png`}
                alt={name}
                className="object-cover"
            />
            <AvatarFallback className="bg-transparent rounded-none flex items-center justify-center w-full h-full">
                {icon}
            </AvatarFallback>
        </Avatar>
    )
}

export function McpPage() {
    const queryClient = useQueryClient()

    // --- Data Fetching ---
    const { data: mcpSets = [], isLoading: isSetsLoading } = useQuery<McpSet[]>({
        queryKey: ['mcpSets'],
        queryFn: fetchMcpSets,
        select: (data) => data.filter(set => !set.isArchived),
    })

    const { data: mcpPool = [], isLoading: isPoolLoading } = useQuery<McpDef[]>({
        queryKey: ['mcpPool'],
        queryFn: fetchMcpPool,
    })

    // --- State ---
    const [isCreateSetOpen, setIsCreateSetOpen] = useState(false)
    const [isAddMcpOpen, setIsAddMcpOpen] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [importJson, setImportJson] = useState('')
    const [githubUrl, setGithubUrl] = useState('')
    const [isLoadingFromGithub, setIsLoadingFromGithub] = useState(false)
    const [foundConfigs, setFoundConfigs] = useState<{ name: string; json: string }[]>([])

    // Selection State
    const [selectedSetId, setSelectedSetId] = useState<string | null>(null)
    const selectedSet = mcpSets.find(s => s.id === selectedSetId) || null

    // Deletion/Editing State
    const [setToDelete, setSetToDelete] = useState<McpSet | null>(null)
    const [mcpToDelete, setMcpToDelete] = useState<McpDef | null>(null)
    const [editingDefId, setEditingDefId] = useState<string | null>(null)
    const [defForm, setDefForm] = useState<Partial<McpDef>>({
        name: '', command: '', args: [], cwd: '', env: {}
    })
    const [newSetName, setNewSetName] = useState('')
    const [newSetDescription, setNewSetDescription] = useState('')
    const [isEditingSetName, setIsEditingSetName] = useState(false)
    const [editedSetName, setEditedSetName] = useState('')
    const [editedSetDescription, setEditedSetDescription] = useState('')

    // Toggle for Library assigned items
    const [showAssigned, setShowAssigned] = useState(false);

    // Search state for Library - Hidden for now (RB-43)
    // const [searchQuery, setSearchQuery] = useState(() => {
    //     // Load from localStorage on initial mount
    //     try {
    //         return localStorage.getItem('mcp-library-search') || ''
    //     } catch {
    //         return ''
    //     }
    // })
    const searchQuery = '' // Placeholder until search is re-enabled (RB-43)
    const searchInputRef = useRef<HTMLInputElement>(null)
    const debouncedSearchQuery = searchQuery // useDebounce disabled (RB-43)

    // --- Sorting & Drag-Drop: Sets (Left) ---
    const {
        sortMode: setsSortMode,
        setSortMode: setSetsSortMode,
        sortedItems: sortedMcpSets,
        handleDragStart: handleSetsDragStart,
        handleDragEnd: handleSetsDragEnd,
        handleDragCancel: handleSetsDragCancel,
        sensors: setsSensors,
        isDragEnabled: isSetsDragEnabled,
        activeId: setsActiveId,
        activeItem: setsActiveItem,
    } = useSortableList<McpSet>({
        items: mcpSets,
        onReorder: async (ids) => {
            await reorderMcpSets(ids)
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
        },
        getName: (item) => item.name,
        getCreatedAt: (item) => item.createdAt,
        getUpdatedAt: (item) => item.updatedAt,
        getOrderIndex: (item) => item.orderIndex,
        enableDragDrop: true,
    })

    // --- Sorting & Drag-Drop: Set Items (Center) ---
    const setItemsEnriched = useMemo(() => {
        if (!selectedSet) return []
        return selectedSet.items.map(item => {
            const def = mcpPool.find(d => d.id === item.serverId)
            return {
                id: item.serverId,
                ...item,
                name: def?.name || '?',
                createdAt: (def as any)?.createdAt || new Date().toISOString(),
                updatedAt: (def as any)?.updatedAt || new Date().toISOString(),
            }
        })
    }, [selectedSet, mcpPool])

    const {
        sortMode: itemsSortMode,
        setSortMode: setItemsSortMode,
        sortedItems: sortedSetItems,
        handleDragStart: handleItemsDragStart,
        handleDragEnd: handleItemsDragEnd,
        handleDragCancel: handleItemsDragCancel,
        sensors: itemsSensors,
        isDragEnabled: isItemsDragEnabled,
        activeId: itemsActiveId,
        activeItem: itemsActiveItem,
    } = useSortableList({
        items: setItemsEnriched,
        onReorder: async (ids) => {
            if (!selectedSet) return;
            const newItems = ids.map(serverId => {
                const original = selectedSet.items.find(i => i.serverId === serverId)
                return original || { serverId, disabled: false }
            })
            await updateMcpSet(selectedSet.id, { items: newItems })
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
        },
        initialSort: { type: 'created', direction: 'desc' },
        getName: (item) => item.name,
        getCreatedAt: (item) => item.createdAt,
        getUpdatedAt: (item) => item.updatedAt,
        enableDragDrop: true,
    })

    // --- Sorting & Drag-Drop: Library (Right) ---
    const libraryItemsEnriched = useMemo(() => {
        let items = mcpPool;
        if (selectedSet && !showAssigned) {
            // Optimization: Use Set for O(1) lookup
            const assignedIds = new Set(selectedSet.items.map(i => i.serverId));
            items = mcpPool.filter(def => !assignedIds.has(def.id));
        }

        // Apply search filter (using debounced query for performance)
        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase();
            items = items.filter(def => {
                // Search by name
                if (def.name.toLowerCase().includes(query)) return true;

                // Search by command
                if (def.command?.toLowerCase().includes(query)) return true;

                // Search by url (HTTP/SSE type)
                if (def.url?.toLowerCase().includes(query)) return true;

                // Search by description
                if (def.description?.toLowerCase().includes(query)) return true;

                // Search by args
                if (def.args?.some(arg => arg.toLowerCase().includes(query))) return true;

                // Search by env keys
                if (def.env) {
                    const envKeys = Object.keys(def.env).join(' ').toLowerCase();
                    if (envKeys.includes(query)) return true;
                }

                return false;
            });
        }

        return items.map(def => {
            const isAssigned = selectedSet?.items.some(item => item.serverId === def.id);
            return {
                ...def,
                isAssigned,
                // Ensure sorting fields exist (fallback to current time for stability if meaningful, but 0 might be better?)
                // User asked for current time fallback.
                createdAt: (def as any)?.createdAt || new Date().toISOString(),
                updatedAt: (def as any)?.updatedAt || new Date().toISOString(),
            }
        })
    }, [selectedSet, mcpPool, showAssigned, debouncedSearchQuery]);

    const {
        sortMode: librarySortMode,
        setSortMode: setLibrarySortMode,
        sortedItems: sortedLibraryItems,
        handleDragStart: handleLibraryDragStart,
        handleDragEnd: handleLibraryDragEnd,
        handleDragCancel: handleLibraryDragCancel,
        sensors: librarySensors,
        isDragEnabled: isLibraryDragEnabled,
        activeId: libraryActiveId,
        activeItem: libraryActiveItem,
    } = useSortableList({
        items: libraryItemsEnriched,
        initialSort: { type: 'a-z', direction: 'asc' },
        getName: (item) => item.name,
        getCreatedAt: (item) => item.createdAt,
        getUpdatedAt: (item) => item.updatedAt,
        enableDragDrop: true,
    })


    useEffect(() => {
        if (mcpSets.length > 0 && !selectedSetId) {
            setSelectedSetId(mcpSets[0]?.id || null)
        }
    }, [mcpSets, selectedSetId])

    // Save search query to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('mcp-library-search', searchQuery)
        } catch {
            // Ignore localStorage errors
        }
    }, [searchQuery])

    // Keyboard shortcut for search (Ctrl/Cmd+K)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [])

    const resetDefForm = () => {
        setDefForm({ name: '', command: '', args: [], cwd: '', env: {} })
    }

    // --- Mutation Wrappers ---
    const createSetMutation = useMutation({
        mutationFn: ({ name, description }: { name: string; description?: string }) => createMcpSet(name, [], description),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
            setIsCreateSetOpen(false)
            setNewSetName('')
            setNewSetDescription('')
            toast.success('MCP Set created')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const archiveSetMutation = useMutation({
        mutationFn: (id: string) => updateMcpSet(id, { isArchived: true }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
            setSetToDelete(null)
            if (selectedSet?.id === setToDelete?.id) setSelectedSetId(null)
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const createDefMutation = useMutation({
        mutationFn: (def: Omit<McpDef, 'id'>) => createMcpDef(def),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpPool'] })
            setIsAddMcpOpen(false)
            toast.success('MCP Definition created')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const updateDefMutation = useMutation({
        mutationFn: ({ id, def }: { id: string; def: Partial<McpDef> }) => updateMcpDef(id, def),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpPool'] })
            setIsAddMcpOpen(false)
            toast.success('MCP Definition updated')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const deleteDefMutation = useMutation({
        mutationFn: (id: string) => deleteMcpDef(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpPool'] })
            setMcpToDelete(null)
            toast.success('MCP Definition deleted')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const addMcpToSetMutation = useMutation({
        mutationFn: ({ setId, serverId }: { setId: string; serverId: string }) => {
            const set = mcpSets.find(s => s.id === setId)
            if (!set) throw new Error('Set not found')
            const newItems = [...set.items, { serverId, disabled: false }]
            return updateMcpSet(setId, { items: newItems })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
            toast.success('Added to Set')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const removeMcpFromSetMutation = useMutation({
        mutationFn: ({ setId, serverId }: { setId: string; serverId: string }) => {
            const set = mcpSets.find(s => s.id === setId)
            if (!set) throw new Error('Set not found')
            const newItems = set.items.filter(i => i.serverId !== serverId)
            return updateMcpSet(setId, { items: newItems })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
            toast.success('Removed from Set')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const toggleMcpInSetMutation = useMutation({
        mutationFn: ({ setId, serverId, disabled }: { setId: string; serverId: string; disabled: boolean }) => {
            const set = mcpSets.find(s => s.id === setId)
            if (!set) throw new Error('Set not found')
            const newItems = set.items.map(i => i.serverId === serverId ? { ...i, disabled } : i)
            return updateMcpSet(setId, { items: newItems })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    // --- Handlers ---
    const handleCreateSet = () => {
        if (!newSetName.trim()) return
        createSetMutation.mutate({ name: newSetName, description: newSetDescription || undefined })
    }

    const handleSaveSetName = () => {
        if (!selectedSet || !editedSetName.trim()) return
        updateMcpSet(selectedSet.id, { name: editedSetName, description: editedSetDescription })
            .then(() => {
                queryClient.invalidateQueries({ queryKey: ['mcpSets'] })
                setIsEditingSetName(false)
                toast.success('Set updated')
            })
            .catch(error => toast.error(`Failed: ${getErrorMessage(error)}`))
    }

    const handleStartEditingSetName = () => {
        if (!selectedSet) return
        setEditedSetName(selectedSet.name)
        setEditedSetDescription(selectedSet.description || '')
        setIsEditingSetName(true)
    }

    const handleSaveDef = () => {
        if (!defForm.name?.trim()) {
            toast.error('Name is required')
            return
        }

        // Validate based on type
        const isHttp = defForm.type === 'http' || defForm.type === 'sse' || (defForm.url && !defForm.command)
        if (isHttp) {
            if (!defForm.url?.trim()) {
                toast.error('URL is required for HTTP/SSE type')
                return
            }
        } else {
            if (!defForm.command?.trim()) {
                toast.error('Command is required for stdio type')
                return
            }
        }

        if (editingDefId) {
            updateDefMutation.mutate({ id: editingDefId, def: defForm })
        } else {
            createDefMutation.mutate(defForm as Omit<McpDef, 'id'>)
        }
    }

    const handleOpenDefModal = (def?: McpDef) => {
        if (def) {
            setEditingDefId(def.id)
            setDefForm({
                name: def.name,
                command: def.command,
                args: def.args,
                cwd: def.cwd || '',
                type: def.type,
                url: def.url || '',
                env: def.env
            })
        } else {
            setEditingDefId(null)
            resetDefForm()
        }
        setIsAddMcpOpen(true)
    }

    const normalizeMcpJson = (jsonString: string): string => {
        let jsonToParse = jsonString.trim()
        if (!jsonToParse) return ''

        // Simple heuristic to fix common copy-paste issues
        if (jsonToParse.startsWith('"mcpServers"') || jsonToParse.startsWith("'mcpServers'")) {
            jsonToParse = `{${jsonToParse}}`
        }
        else if (/^["'][^"']+["']\s*:\s*\{/.test(jsonToParse) && !jsonToParse.startsWith('{')) {
            jsonToParse = `{${jsonToParse}}`
        }
        return jsonToParse
    }

    const isValidMcpConfig = (jsonString: string): boolean => {
        try {
            const jsonToParse = normalizeMcpJson(jsonString)
            if (!jsonToParse) return false

            const parsed = JSON.parse(jsonToParse)

            // Check for specific MCP structure
            if (parsed.mcpServers) return true
            if (parsed.command || parsed.args) return true // Single stdio server config
            if (parsed.type && parsed.url) return true // Single http/sse server config

            // Check if it's a map of servers
            if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
                // Check if any value looks like a server config (stdio or http type)
                return Object.values(parsed).some((val: any) =>
                    val && typeof val === 'object' && (val.command || val.args || (val.type && val.url) || val.url)
                )
            }

            return false
        } catch {
            return false
        }
    }

    // Auto-paste from clipboard
    // Use a ref to track if we've already attempted to paste for the current "open session"
    // This prevents the "infinite paste" loop when user clears the input
    const hasAutoPasted = useRef(false)

    useEffect(() => {
        if (isImportOpen) {
            // Only attempt to paste if we haven't already done so for this session
            // and the input is currently empty
            if (!hasAutoPasted.current && !importJson && navigator.clipboard) {
                navigator.clipboard.readText().then(text => {
                    if (text && isValidMcpConfig(text)) {
                        const normalized = normalizeMcpJson(text)

                        setImportJson(normalized)
                        hasAutoPasted.current = true
                        toast.success('Detected valid MCP config from clipboard')
                    }
                }).catch(() => {
                    // Ignore clipboard errors
                })
            }
        } else {
            // Reset the flag when the dialog closes
            hasAutoPasted.current = false
        }
        // IMPORTANT: We intentionally omit importJson from the dependency array 
        // because we only want to check/paste *when the dialog opens* or *when the open state changes*.
        // We do NOT want to re-run this logic when the user edits or clears the text area (changing importJson).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isImportOpen])

    const handleImportJson = () => {
        try {
            const jsonToParse = normalizeMcpJson(importJson) || importJson // fallback to original if empty

            const parsed = JSON.parse(jsonToParse)
            let servers: Record<string, any> = {}

            if (parsed.mcpServers) {
                servers = parsed.mcpServers
            } else if (parsed.command || parsed.args) {
                const serverName = Object.keys(JSON.parse(jsonToParse))[0] || 'Imported Server'
                servers = { [serverName]: parsed }
            } else {
                servers = parsed
            }

            // Helper to check if a config is HTTP/SSE type
            const isHttpType = (config: any): boolean => {
                return config.type === 'http' || config.type === 'sse' || (config.url && !config.command)
            }

            // Extract server name for stdio type
            const extractServerName = (command?: string, args?: string[]): string => {
                if (!command) return ''
                if (!args || args.length === 0) return command
                const lastArg = args[args.length - 1]
                if (lastArg.includes('@')) {
                    const parts = lastArg.split('/')
                    const packagePart = parts[parts.length - 1]
                    return packagePart.replace(/@.*$/, '').replace(/^mcp-/, '').replace(/^server-/, '')
                }
                if (args.includes('-m') && args.length > args.indexOf('-m') + 1) {
                    const moduleName = args[args.indexOf('-m') + 1]
                    return moduleName.split('.')[0].replace(/_/g, '-')
                }
                return lastArg
            }

            // Extract identifier for matching (works for both stdio and http types)
            const getServerIdentifier = (config: any, name: string): string => {
                if (isHttpType(config)) {
                    // For HTTP type, use URL or name as identifier
                    return config.url || name
                }
                return extractServerName(config.command, config.args || []) || name
            }

            const promises = Object.entries(servers).map(async ([name, config]: [string, any]) => {
                const serverIdentifier = getServerIdentifier(config, name)
                const existing = mcpPool.find(def => {
                    const existingIdentifier = isHttpType(def)
                        ? (def.url || def.name)
                        : (extractServerName(def.command, def.args) || def.name)
                    return existingIdentifier.toLowerCase() === serverIdentifier.toLowerCase()
                })

                // Build defData based on server type
                const defData: any = {
                    name: name,
                    description: config.description,
                    env: config.env || {}
                }

                if (isHttpType(config)) {
                    // HTTP/SSE type
                    defData.type = config.type || 'http'
                    defData.url = config.url
                } else {
                    // stdio type (default)
                    defData.command = config.command
                    defData.args = config.args || []
                }

                if (existing) {
                    return updateDefMutation.mutateAsync({ id: existing.id, def: defData })
                } else {
                    return createDefMutation.mutateAsync(defData)
                }
            })

            Promise.all(promises).then(() => {
                toast.success(`Imported ${Object.keys(servers).length} MCP server(s)`)
                setIsImportOpen(false)
                setImportJson('')
            }).catch(error => {
                toast.error(`Import failed: ${getErrorMessage(error)}`)
            })
        } catch (error) {
            toast.error('Invalid JSON format')
        }
    }

    const handleLoadFromGithub = async () => {
        if (!githubUrl.trim()) {
            toast.error('Please enter a GitHub URL')
            return
        }

        setIsLoadingFromGithub(true)
        try {
            let rawUrl = githubUrl
            if (githubUrl.includes('github.com')) {
                rawUrl = githubUrl
                    .replace('github.com', 'raw.githubusercontent.com')
                    .replace('/blob/', '/')

                if (!rawUrl.includes('claude_desktop_config.json') && !rawUrl.includes('.json')) {
                    const repoMatch = githubUrl.match(/github\.com\/([^/]+)\/([^/]+)/)
                    if (repoMatch) {
                        const [, owner, repo] = repoMatch
                        const cleanRepo = repo.replace(/\.git$/, '')
                        const possiblePaths = [
                            '/main/claude_desktop_config.json',
                            '/master/claude_desktop_config.json',
                            '/main/.config/claude_desktop_config.json',
                            '/master/.config/claude_desktop_config.json'
                        ]

                        let configFound = false
                        for (const path of possiblePaths) {
                            try {
                                const testUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}${path}`
                                const response = await fetch(testUrl)
                                if (response.ok) {
                                    const text = await response.text()
                                    setImportJson(text)
                                    toast.success('Loaded configuration from GitHub')
                                    configFound = true
                                    break
                                }
                            } catch {
                                continue
                            }
                        }

                        if (!configFound) {
                            // Try to find all mcpServers configs from README
                            const readmePaths = ['/main/README.md', '/master/README.md']
                            let readmeContent = ''
                            for (const path of readmePaths) {
                                try {
                                    const readmeUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}${path}`
                                    const response = await fetch(readmeUrl)
                                    if (response.ok) {
                                        readmeContent = await response.text()
                                        break
                                    }
                                } catch {
                                    continue
                                }
                            }

                            const jsonBlocks: { name: string; json: string }[] = []
                            const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi
                            let match
                            while ((match = codeBlockRegex.exec(readmeContent)) !== null) {
                                try {
                                    const jsonStr = match[1].trim()
                                    const parsed = JSON.parse(jsonStr)
                                    if (parsed.mcpServers) {
                                        const serverNames = Object.keys(parsed.mcpServers)
                                        const label = serverNames.length > 0 ? serverNames[0] : 'config'
                                        jsonBlocks.push({ name: label, json: jsonStr })
                                    }
                                } catch {
                                }
                            }

                            if (jsonBlocks.length > 0) {
                                setFoundConfigs(jsonBlocks)
                                setImportJson(jsonBlocks[0].json)
                                toast.success(`Found ${jsonBlocks.length} configuration(s) in README`)
                                configFound = true
                            } else {
                                let packageName = ''
                                const packageJsonPaths = ['/main/package.json', '/master/package.json']
                                for (const path of packageJsonPaths) {
                                    try {
                                        const pkgUrl = `https://raw.githubusercontent.com/${owner}/${cleanRepo}${path}`
                                        const response = await fetch(pkgUrl)
                                        if (response.ok) {
                                            const pkgJson = await response.json()
                                            if (pkgJson.name) {
                                                packageName = pkgJson.name
                                                break
                                            }
                                        }
                                    } catch {
                                        continue
                                    }
                                }

                                if (!packageName) {
                                    const npxMatch = readmeContent.match(/npx\s+(?:-y\s+)?(@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+|[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+|[a-zA-Z0-9@_-]+)/)
                                    if (npxMatch && npxMatch[1] && !npxMatch[1].includes('⭐') && npxMatch[1].length > 2) {
                                        packageName = npxMatch[1]
                                    }
                                }

                                if (!packageName) {
                                    packageName = `${owner}/${cleanRepo}`
                                }

                                const serverName = cleanRepo.replace(/^mcp-/, '').replace(/-mcp$/, '').replace(/MCP$/i, '')
                                const generatedConfig = {
                                    mcpServers: {
                                        [serverName]: {
                                            command: 'npx',
                                            args: ['-y', packageName]
                                        }
                                    }
                                }
                                setImportJson(JSON.stringify(generatedConfig, null, 2))
                                setFoundConfigs([])
                                toast.success(`Auto-generated configuration for ${serverName}`)
                                configFound = true
                            }
                        }

                        if (!configFound) throw new Error('Could not find or generate MCP configuration')
                        return
                    }
                }
            }

            const response = await fetch(rawUrl)
            if (!response.ok) throw new Error(`Failed to fetch: ${response.statusText}`)
            const text = await response.text()
            setImportJson(text)
            toast.success('Loaded configuration from GitHub')
        } catch (error) {
            toast.error(`Failed to load from GitHub: ${getErrorMessage(error)}`)
        } finally {
            setIsLoadingFromGithub(false)
        }
    }

    if (isSetsLoading || isPoolLoading) return <LoadingState text="Loading MCP configuration..." />

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* ... Dialogs same as before ... */}
            <Dialog open={isCreateSetOpen} onOpenChange={setIsCreateSetOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Create MCP Set</DialogTitle>
                        <DialogDescription>Create a new collection of MCP servers.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Set Name</Label>
                            <Input value={newSetName} onChange={e => setNewSetName(e.target.value)} placeholder="My MCP Set" />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea value={newSetDescription} onChange={e => setNewSetDescription(e.target.value)} placeholder="Description (optional)" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateSetOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateSet}>Create Set</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isAddMcpOpen} onOpenChange={(open) => {
                setIsAddMcpOpen(open)
                if (!open) {
                    setEditingDefId(null)
                    resetDefForm()
                }
            }}>
                <DialogContent className="max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{editingDefId ? 'Edit MCP Definition' : 'Add MCP Definition'}</DialogTitle>
                        <DialogDescription>Configure an MCP server definition.</DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[60vh] pr-4">
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Name</Label>
                                <Input value={defForm.name} onChange={e => setDefForm({ ...defForm, name: e.target.value })} placeholder="e.g. Postgres" />
                            </div>
                            <div className="space-y-2">
                                <Label>Type</Label>
                                <div className="flex gap-2">
                                    <Button
                                        type="button"
                                        variant={!defForm.type || defForm.type === 'stdio' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDefForm({ ...defForm, type: undefined, url: '' })}
                                    >
                                        stdio
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={defForm.type === 'http' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDefForm({ ...defForm, type: 'http', command: '', args: [] })}
                                    >
                                        http
                                    </Button>
                                    <Button
                                        type="button"
                                        variant={defForm.type === 'sse' ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => setDefForm({ ...defForm, type: 'sse', command: '', args: [] })}
                                    >
                                        sse
                                    </Button>
                                </div>
                            </div>
                            {(!defForm.type || defForm.type === 'stdio') ? (
                                <>
                                    <div className="space-y-2">
                                        <Label>Command</Label>
                                        <Input value={defForm.command} onChange={e => setDefForm({ ...defForm, command: e.target.value })} placeholder="e.g. npx, docker, python" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Arguments (one per line)</Label>
                                        <Textarea
                                            value={defForm.args?.join('\n')}
                                            onChange={e => setDefForm({ ...defForm, args: e.target.value.split('\n').filter(Boolean) })}
                                            placeholder="-y\n@modelcontextprotocol/server-postgres\npostgresql://user:pass@localhost/db"
                                            className="font-mono text-sm"
                                            rows={5}
                                        />
                                    </div>
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Label>URL</Label>
                                    <Input value={defForm.url} onChange={e => setDefForm({ ...defForm, url: e.target.value })} placeholder="e.g. http://127.0.0.1:3845/mcp" />
                                </div>
                            )}
                            <EnvEditor
                                value={defForm.env || {}}
                                onChange={(env) => setDefForm({ ...defForm, env })}
                            />
                        </div>
                    </ScrollArea>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddMcpOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDef}>Save Definition</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={isImportOpen} onOpenChange={(open) => {
                setIsImportOpen(open)
                if (!open) {
                    setImportJson('')
                    setGithubUrl('')
                    setFoundConfigs([])
                }
            }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Import MCP Servers</DialogTitle>
                        <DialogDescription>Import from JSON configuration or GitHub URL.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="flex gap-2">
                            <Input
                                value={githubUrl}
                                onChange={e => setGithubUrl(e.target.value)}
                                placeholder="GitHub URL (e.g. github.com/owner/repo)"
                                className="flex-1"
                            />
                            <Button onClick={handleLoadFromGithub} disabled={isLoadingFromGithub}>
                                {isLoadingFromGithub ? 'Loading...' : 'Load'}
                            </Button>
                        </div>
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-background px-2 text-muted-foreground">Or paste JSON</span>
                            </div>
                        </div>
                        {foundConfigs.length > 1 && (
                            <div className="flex flex-wrap gap-2 pb-2">
                                {foundConfigs.map((config, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setImportJson(config.json)}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors shrink-0",
                                            importJson === config.json
                                                ? "bg-primary text-primary-foreground"
                                                : "bg-muted hover:bg-muted/80 text-muted-foreground"
                                        )}
                                    >
                                        {config.name}
                                    </button>
                                ))}
                            </div>
                        )}
                        <Textarea
                            value={importJson}
                            onChange={e => setImportJson(e.target.value)}
                            placeholder='{"mcpServers": { ... }}'
                            className="font-mono text-sm h-[300px]"
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsImportOpen(false)}>Cancel</Button>
                        <Button onClick={handleImportJson} disabled={!importJson.trim()}>Import</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!mcpToDelete} onOpenChange={() => setMcpToDelete(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete MCP Definition?</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete <span className="font-semibold text-foreground">"{mcpToDelete?.name}"</span>?
                            <br /><br />
                            <span className="text-destructive font-medium flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4" />
                                This will permanently remove it from the library and all sets.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setMcpToDelete(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={() => mcpToDelete && deleteDefMutation.mutate(mcpToDelete.id)}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <div className="flex-1 min-h-0 overflow-hidden p-6 grid grid-cols-3 gap-6">
                {/* 1. MCP Sets List */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            MCP Sets
                        </h3>
                        <div className="flex items-center">
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsCreateSetOpen(true)}>
                                            <Plus className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>새 MCP Set 만들기</TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                            <SortMenu currentSort={setsSortMode} onSortChange={setSetsSortMode} />
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            <DndContext
                                sensors={setsSensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleSetsDragStart}
                                onDragEnd={handleSetsDragEnd}
                                onDragCancel={handleSetsDragCancel}
                            >
                                <SortableContext
                                    items={sortedMcpSets.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {sortedMcpSets.map((set) => (
                                        <SortableMcpSetItem
                                            key={set.id}
                                            set={set}
                                            viewedSetId={selectedSetId}
                                            setViewedSetId={setSelectedSetId}
                                            handleDeleteClick={(id) => archiveSetMutation.mutate(id)}
                                            isDragEnabled={isSetsDragEnabled}
                                        />
                                    ))}
                                </SortableContext>
                                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                                    {setsActiveItem ? (
                                        <div className="px-3 py-3 rounded-lg border border-primary/30 bg-muted/60 shadow-sm">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="flex items-center gap-3 flex-1 min-w-0">
                                                    <div className="flex-1 min-w-0 overflow-hidden">
                                                        <span className="font-medium text-sm text-primary font-semibold">{setsActiveItem.name}</span>
                                                        {setsActiveItem.description && (
                                                            <p className="text-xs text-muted-foreground mt-0.5 truncate">{setsActiveItem.description}</p>
                                                        )}
                                                        <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                                                            <Badge variant="outline" className="text-[10px] h-4 px-1">{setsActiveItem.items.length} Configured</Badge>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                            {mcpSets.length === 0 && (
                                <EmptyState
                                    icon={Layers}
                                    title="No Sets"
                                    description="Create a set to start."
                                />
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* 2. Selected Set Items */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0 h-[65px]">
                        <div className="min-w-0 flex-1">
                            {selectedSet ? (
                                isEditingSetName ? (
                                    <div className="flex items-center gap-2 w-full">
                                        <Input
                                            value={editedSetName}
                                            onChange={(e) => setEditedSetName(e.target.value)}
                                            className="h-8 flex-1"
                                            autoFocus
                                            onKeyDown={e => e.key === 'Enter' && handleSaveSetName()}
                                        />
                                        <div className="flex items-center shrink-0">
                                            <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={handleSaveSetName}><Check className="w-4 h-4" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>저장</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                            <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditingSetName(false)}><X className="w-4 h-4" /></Button>
                                                </TooltipTrigger>
                                                <TooltipContent>취소</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="group flex items-center gap-2 cursor-pointer" onClick={handleStartEditingSetName}>
                                        <h3 className="font-semibold text-sm truncate">{selectedSet.name}</h3>
                                        <Edit className="w-3 h-3 text-muted-foreground transition-opacity" />
                                    </div>
                                )
                            ) : (
                                <h3 className="font-semibold text-sm text-muted-foreground">No Set Selected</h3>
                            )}
                            {selectedSet && !isEditingSetName && (
                                <p className="text-xs text-muted-foreground truncate max-w-[90%]">
                                    {selectedSet.description || "No description"}
                                </p>
                            )}
                        </div>
                        {selectedSet && (
                            <SortMenu currentSort={itemsSortMode} onSortChange={setItemsSortMode} />
                        )}
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            {selectedSet ? (
                                selectedSet.items.length === 0 ? (
                                    <div className="h-40 flex items-center justify-center">
                                        <p className="text-sm text-muted-foreground text-center">
                                            This set is empty.<br />
                                            Add items from the Library -&gt;
                                        </p>
                                    </div>
                                ) : (
                                    <DndContext
                                        sensors={itemsSensors}
                                        collisionDetection={closestCenter}
                                        onDragStart={handleItemsDragStart}
                                        onDragEnd={handleItemsDragEnd}
                                        onDragCancel={handleItemsDragCancel}
                                    >
                                        <SortableContext
                                            items={sortedSetItems.map(i => i.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            {sortedSetItems.map((item) => {
                                                const def = mcpPool.find(p => p.id === item.serverId)
                                                if (!def) return null
                                                const isEnabled = !item.disabled

                                                return (
                                                    <SortableSetItem
                                                        key={item.serverId}
                                                        item={item}
                                                        def={def}
                                                        isDragEnabled={isItemsDragEnabled}
                                                        onToggle={() => toggleMcpInSetMutation.mutate({
                                                            setId: selectedSet.id,
                                                            serverId: item.serverId,
                                                            disabled: isEnabled
                                                        })}
                                                        onRemove={() => removeMcpFromSetMutation.mutate({ setId: selectedSet.id, serverId: item.serverId })}
                                                        onEdit={() => handleOpenDefModal(def)}
                                                    />
                                                )
                                            })}
                                        </SortableContext>
                                        <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                                            {itemsActiveItem ? (() => {
                                                const def = mcpPool.find(p => p.id === itemsActiveItem.serverId);
                                                if (!def) return null;
                                                return (
                                                    <div className="p-3 rounded-lg border border-primary/30 bg-muted/60 shadow-sm">
                                                        <div className="flex items-start gap-2">
                                                            <div className="mt-0.5 shrink-0 w-8 h-8 rounded flex items-center justify-center bg-primary/10 text-primary">
                                                                <McpIcon def={def} className="w-5 h-5" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <span className="font-medium text-sm">{def.name}</span>
                                                                <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{getMcpDefDisplayString(def)}</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })() : null}
                                        </DragOverlay>
                                    </DndContext>
                                )
                            ) : (
                                <div className="h-full flex items-center justify-center p-8">
                                    <p className="text-muted-foreground">Select a set to view items</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* 3. Library List */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 shrink-0 space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm flex items-center gap-2">
                                    <Library className="w-4 h-4 text-muted-foreground" />
                                    Library
                                </h3>
                                <Badge variant="outline" className="text-[10px] h-4 px-1">
                                    {sortedLibraryItems.length}
                                </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                                {/* Toggle Show Assigned */}
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className={cn("h-8 w-8 p-0", showAssigned ? "text-primary" : "text-muted-foreground")}
                                    onClick={() => setShowAssigned(!showAssigned)}
                                    title={showAssigned ? "Hide assigned items" : "Show assigned items"}
                                >
                                    {showAssigned ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                                </Button>

                                <SortMenu currentSort={librarySortMode} onSortChange={setLibrarySortMode} className="mr-1" />
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsImportOpen(true)} title="Import">
                                    <Import className="w-4 h-4" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenDefModal()} title="Create new">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>

                        {/* Search Input - Hidden for now (RB-43) */}
                        {/* <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" aria-hidden="true" />
                            <Input
                                ref={searchInputRef}
                                placeholder="Search servers... (Ctrl+K)"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                                aria-label="Search MCP servers"
                                aria-describedby="search-results-count"
                                role="searchbox"
                            />
                            <span id="search-results-count" className="sr-only" aria-live="polite" aria-atomic="true">
                                {sortedLibraryItems.length} {sortedLibraryItems.length === 1 ? 'result' : 'results'} found
                            </span>
                            {searchQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                                    onClick={() => setSearchQuery('')}
                                    title="Clear search"
                                    aria-label="Clear search query"
                                >
                                    <X className="w-3 h-3" aria-hidden="true" />
                                </Button>
                            )}
                        </div> */}
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            <DndContext
                                sensors={librarySensors}
                                collisionDetection={closestCenter}
                                onDragStart={handleLibraryDragStart}
                                onDragEnd={handleLibraryDragEnd}
                                onDragCancel={handleLibraryDragCancel}
                            >
                                <SortableContext
                                    items={sortedLibraryItems.map(i => i.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {sortedLibraryItems.length === 0 ? (
                                        <EmptyState
                                            icon={searchQuery ? Search : Box}
                                            title={searchQuery ? "No results found" : "Library Empty"}
                                            description={searchQuery ? `No servers matching "${searchQuery}"` : (selectedSet ? "All items are in this set." : "No MCP definitions found.")}
                                        />
                                    ) : (
                                        sortedLibraryItems.map(def => (
                                            <SortableLibraryItem
                                                key={def.id}
                                                def={def}
                                                isDragEnabled={isLibraryDragEnabled}
                                                selectedSetId={selectedSetId}
                                                searchQuery={searchQuery}
                                                onAddToSet={() => {
                                                    if (selectedSetId) addMcpToSetMutation.mutate({ setId: selectedSetId, serverId: def.id })
                                                }}
                                                onEdit={() => handleOpenDefModal(def)}
                                                onDelete={() => setMcpToDelete(def)}
                                            />
                                        ))
                                    )}
                                </SortableContext>
                                <DragOverlay dropAnimation={{ duration: 200, easing: 'ease-out' }}>
                                    {libraryActiveItem ? (
                                        <div className="p-3 rounded-lg border border-primary/30 bg-muted/60 shadow-sm">
                                            <div className="flex items-start gap-2">
                                                <div className="mt-0.5 shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center text-primary">
                                                    <McpIcon def={libraryActiveItem} className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-medium text-sm">{libraryActiveItem.name}</span>
                                                    <p className="text-xs font-mono text-muted-foreground mt-1 truncate">{getMcpDefDisplayString(libraryActiveItem)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : null}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    )
}
