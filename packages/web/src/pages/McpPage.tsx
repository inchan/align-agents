import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchMcpSets, createMcpSet, updateMcpSet,
    fetchMcpPool, createMcpDef, updateMcpDef, deleteMcpDef,
    type McpSet, type McpDef
} from '../lib/api'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { getErrorMessage, cn } from '../lib/utils'
import {
    Plus, Trash2, Server, GripVertical, Library, Layers, MoreVertical, Edit,
    Box, X, Database, Folder, Search, MessageSquare, GitBranch, Globe,
    Check, Import, AlertTriangle
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
// Card components removed as unused
import { Switch } from '@/components/ui/switch'
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
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// --- Components ---

interface SortableMcpSetItemProps {
    set: McpSet
    viewedSetId: string | null
    setViewedSetId: (id: string) => void
    handleDeleteClick: (id: string, name: string) => void
}

function SortableMcpSetItem({ set, viewedSetId, setViewedSetId, handleDeleteClick }: SortableMcpSetItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: set.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => setViewedSetId(set.id)}
            className={cn(
                "group relative px-3 py-3 rounded-lg border transition-all duration-200 cursor-pointer max-w-full",
                viewedSetId === set.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/60 hover:border-primary/30 hover:shadow-sm"
            )}>
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground transition-colors">
                        <GripVertical className="w-4 h-4" />
                    </div>

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

function getMcpIcon(name: string, command: string) {
    const lowerName = name.toLowerCase()
    const lowerCmd = command.toLowerCase()

    if (lowerName.includes('github') || lowerName.includes('git') || lowerCmd.includes('git')) return <GitBranch className="w-4 h-4" />
    if (lowerName.includes('file') || lowerName.includes('fs') || lowerCmd.includes('fs')) return <Folder className="w-4 h-4" />
    if (lowerName.includes('postgres') || lowerName.includes('sql') || lowerName.includes('db') || lowerName.includes('database')) return <Database className="w-4 h-4" />
    if (lowerName.includes('search') || lowerName.includes('brave') || lowerName.includes('google')) return <Search className="w-4 h-4" />
    if (lowerName.includes('slack') || lowerName.includes('discord') || lowerName.includes('chat')) return <MessageSquare className="w-4 h-4" />
    if (lowerName.includes('web') || lowerName.includes('http') || lowerName.includes('fetch')) return <Globe className="w-4 h-4" />

    return <Server className="w-4 h-4" />
}

function McpIcon({ def, className }: { def: McpDef, className?: string }) {
    const { name, command, args } = def

    // 1. Try to find GitHub URL in args to get the owner's avatar
    let githubOwner = ''
    if (args) {
        for (const arg of args) {
            // Match github.com/OWNER or ghcr.io/OWNER
            const match = arg.match(/(?:github\.com|ghcr\.io)[/:]([^/]+)/)
            if (match && match[1]) {
                githubOwner = match[1]
                break
            }
        }
    }

    const icon = getMcpIcon(name, command)

    if (!githubOwner) {
        return icon
    }

    // Pass styling to Avatar
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


    useEffect(() => {
        if (mcpSets.length > 0 && !selectedSetId) {
            setSelectedSetId(mcpSets[0]?.id || null)
        }
    }, [mcpSets, selectedSetId])

    const resetDefForm = () => {
        setDefForm({ name: '', command: '', args: [], cwd: '', env: {} })
    }

    // --- Computed ---
    // Library items are those in mcpPool that are NOT in the selected set
    const libraryItems = selectedSet
        ? mcpPool.filter(def => !selectedSet.items.some(item => item.serverId === def.id))
        : mcpPool

    // --- Mutations ---
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
            // toast.success('MCP Set archived') // Removed immediate toast or make it subtle if needed, user asked for "no popup" which usually means confirmation dialog.
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
        if (!defForm.name?.trim() || !defForm.command?.trim()) {
            toast.error('Name and Command are required')
            return
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
                env: def.env
            })
        } else {
            setEditingDefId(null)
            resetDefForm()
        }
        setIsAddMcpOpen(true)
    }

    const handleImportJson = () => {
        try {
            // Try to parse directly first
            let jsonToParse = importJson.trim()

            // If starts with "mcpServers" (without outer braces), wrap it
            if (jsonToParse.startsWith('"mcpServers"') || jsonToParse.startsWith("'mcpServers'")) {
                jsonToParse = `{${jsonToParse}}`
            }
            // If starts with a quoted key followed by colon and object (single server definition like "name": {...}), wrap it
            else if (/^["'][^"']+["']\s*:\s*\{/.test(jsonToParse) && !jsonToParse.startsWith('{')) {
                jsonToParse = `{${jsonToParse}}`
            }

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

            const extractServerName = (command: string, args: string[]): string => {
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

            const promises = Object.entries(servers).map(async ([name, config]: [string, any]) => {
                const serverName = extractServerName(config.command, config.args || [])
                const existing = mcpPool.find(def => {
                    const existingName = extractServerName(def.command, def.args)
                    return existingName.toLowerCase() === serverName.toLowerCase()
                })

                const defData = {
                    name: name,
                    command: config.command,
                    args: config.args || [],
                    description: config.description,
                    env: config.env || {}
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

                            // Extract all JSON code blocks from README
                            const jsonBlocks: { name: string; json: string }[] = []
                            const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)```/gi
                            let match
                            while ((match = codeBlockRegex.exec(readmeContent)) !== null) {
                                try {
                                    const jsonStr = match[1].trim()
                                    const parsed = JSON.parse(jsonStr)
                                    if (parsed.mcpServers) {
                                        // Get first server name as label
                                        const serverNames = Object.keys(parsed.mcpServers)
                                        const label = serverNames.length > 0 ? serverNames[0] : 'config'
                                        jsonBlocks.push({ name: label, json: jsonStr })
                                    }
                                } catch {
                                    // Not valid JSON, skip
                                }
                            }

                            if (jsonBlocks.length > 0) {
                                setFoundConfigs(jsonBlocks)
                                setImportJson(jsonBlocks[0].json)
                                toast.success(`Found ${jsonBlocks.length} configuration(s) in README`)
                                configFound = true
                            } else {
                                // Fallback: generate from package.json
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
                                    // Try npx pattern from README
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

    // Drag & Drop (Sets)
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    )
    const handleDragEnd = (event: DragEndEvent) => {
        console.log('Drag end', event)
    }

    if (isSetsLoading || isPoolLoading) return <LoadingState text="Loading MCP configuration..." />

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            {/* Dialogs */}
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

            <Dialog open={isAddMcpOpen} onOpenChange={setIsAddMcpOpen}>
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
                            <div className="space-y-2">
                                <Label>Environment Variables (JSON)</Label>
                                <Textarea
                                    value={JSON.stringify(defForm.env || {}, null, 2)}
                                    onChange={e => {
                                        try {
                                            setDefForm({ ...defForm, env: JSON.parse(e.target.value) })
                                        } catch { } // Ignore parse errors while typing
                                    }}
                                    className="font-mono text-sm"
                                    placeholder="{}"
                                />
                            </div>
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

            {/* Set Deletion Confirmation Dialog Removed for immediate archive action */}

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
                {/* 1. MCP Sets */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Layers className="w-4 h-4 text-muted-foreground" />
                            MCP Sets
                        </h3>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsCreateSetOpen(true)}>
                            <Plus className="w-4 h-4" />
                        </Button>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={mcpSets.map(s => s.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    {mcpSets.map((set) => (
                                        <SortableMcpSetItem
                                            key={set.id}
                                            set={set}
                                            viewedSetId={selectedSetId}
                                            setViewedSetId={setSelectedSetId}
                                            handleDeleteClick={(id) => archiveSetMutation.mutate(id)}
                                        />
                                    ))}
                                </SortableContext>
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
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={handleSaveSetName}><Check className="w-4 h-4" /></Button>
                                            <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setIsEditingSetName(false)}><X className="w-4 h-4" /></Button>
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
                                    selectedSet.items.map((item) => {
                                        const def = mcpPool.find(p => p.id === item.serverId)
                                        if (!def) return null
                                        return (
                                            <div key={item.serverId} className={cn(
                                                "group flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
                                                item.disabled ? "opacity-60" : ""
                                            )}>
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5 shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center text-primary">
                                                        <McpIcon def={def} className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center justify-between gap-2">
                                                            <TruncateTooltip className="font-medium text-sm">{def.name}</TruncateTooltip>
                                                            <div className="flex items-center gap-1 transition-opacity">
                                                                <Switch
                                                                    checked={!item.disabled}
                                                                    onCheckedChange={(checked) => toggleMcpInSetMutation.mutate({
                                                                        setId: selectedSet.id,
                                                                        serverId: item.serverId,
                                                                        disabled: !checked
                                                                    })}
                                                                />
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                    onClick={() => removeMcpFromSetMutation.mutate({ setId: selectedSet.id, serverId: item.serverId })}
                                                                    title="Remove from Set"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </Button>
                                                            </div>
                                                        </div>
                                                        <TruncateTooltip
                                                            className="text-xs text-muted-foreground font-mono mt-1 bg-muted/50 px-1 py-0.5 rounded w-fit max-w-full"
                                                            contentClassName="font-mono text-xs"
                                                        >
                                                            {def.command} {def.args?.join(' ')}
                                                        </TruncateTooltip>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )
                            ) : (
                                <div className="h-full flex items-center justify-center p-8">
                                    <p className="text-muted-foreground">Select a set to view items</p>
                                </div>
                            )}
                        </div>
                    </ScrollArea>
                </div>

                {/* 3. Library */}
                <div className="flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                    <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0 h-[65px]">
                        <h3 className="font-semibold text-sm flex items-center gap-2">
                            <Library className="w-4 h-4 text-muted-foreground" />
                            Library
                        </h3>
                        <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsImportOpen(true)} title="Import">
                                <Import className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => handleOpenDefModal()} title="Create new">
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                    <ScrollArea className="flex-1">
                        <div className="p-3 space-y-2">
                            {libraryItems.length === 0 ? (
                                <EmptyState
                                    icon={Box}
                                    title="Library Empty"
                                    description={selectedSet ? "All items are in this set." : "No MCP definitions found."}
                                />
                            ) : (
                                libraryItems.map(def => (
                                    <div key={def.id} className="group flex flex-col gap-2 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                                        <div className="flex items-start gap-2">
                                            {selectedSet && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary hover:bg-primary/10 -ml-1"
                                                    onClick={() => addMcpToSetMutation.mutate({ setId: selectedSet.id, serverId: def.id })}
                                                    title="Add to Set"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            )}
                                            <div className="mt-0.5 shrink-0 w-8 h-8 rounded bg-muted flex items-center justify-center text-primary">
                                                <McpIcon def={def} className="w-5 h-5" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <TruncateTooltip
                                                        className="font-medium text-sm"
                                                        side="top"
                                                    >
                                                        {def.name}
                                                    </TruncateTooltip>
                                                </div>
                                                <TruncateTooltip
                                                    className="text-xs text-muted-foreground font-mono mt-1"
                                                    contentClassName="font-mono text-xs"
                                                    side="bottom"
                                                >
                                                    {def.command} {def.args?.join(' ')}
                                                </TruncateTooltip>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6">
                                                        <MoreVertical className="w-3 h-3" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    {selectedSet && (
                                                        <>
                                                            <DropdownMenuItem onClick={() => addMcpToSetMutation.mutate({ setId: selectedSet.id, serverId: def.id })}>
                                                                <Plus className="w-3.5 h-3.5 mr-2" /> Add to Set
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                        </>
                                                    )}
                                                    <DropdownMenuItem onClick={() => handleOpenDefModal(def)}>
                                                        <Edit className="w-3.5 h-3.5 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive focus:text-destructive"
                                                        onClick={() => setMcpToDelete(def)}
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    )
}
