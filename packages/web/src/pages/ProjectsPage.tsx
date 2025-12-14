import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchProjects,
    createProject,
    updateProject,
    deleteProject,
    reorderProjects,
    scanProjects,
    pickProjectFolder,
    fetchToolMetadata,
    fetchTools,
    type UserProject,
    type ToolMetadata,
    fetchProjectDetails
} from '../lib/api'
import { cn, getErrorMessage, getCommonSortableStyle } from '../lib/utils'
import {
    Briefcase,
    Plus,
    // Search, // Hidden for now (RB-43)
    Folder,
    Trash2,
    Edit,
    RefreshCw,
    Code2,
    Terminal,
    MoreVertical,
    Globe,
    FolderOpen,
    Settings,
    FileJson,
    Box
} from 'lucide-react'

// Shared Components
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingState } from '@/components/shared/loading-state'
import { SortMenu } from '../components/common/SortMenu'

// UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { toast } from 'sonner'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { TruncateTooltip } from '@/components/ui/truncate-tooltip'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'

import { useSortableList } from '../hooks/useSortableList'

// --- Components ---

function getSourceIcon(source: string) {
    switch (source) {
        case 'cursor': return <Code2 className="w-4 h-4 text-blue-500" />
        case 'vscode': return <Code2 className="w-4 h-4 text-sky-500" />
        case 'windsurf': return <Terminal className="w-4 h-4 text-purple-500" />
        case 'global': return <Globe className="w-4 h-4 text-secondary" />
        default: return <Folder className="w-4 h-4" />
    }
}

interface SortableProjectItemProps {
    project: UserProject
    selectedProjectId: string | null
    setSelectedProjectId: (id: string) => void
    openEditModal: (project: UserProject) => void
    handleDeleteClick: (id: string) => void
    isDragEnabled?: boolean
}

function SortableProjectItem({
    project,
    selectedProjectId,
    setSelectedProjectId,
    openEditModal,
    handleDeleteClick,
    isDragEnabled
}: SortableProjectItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: project.id,
        disabled: !isDragEnabled
    })

    const style = getCommonSortableStyle(transform, transition, isDragging)

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => setSelectedProjectId(project.id)}
            className={cn(
                "group relative px-3 py-3 rounded-lg border transition-all duration-200 cursor-pointer touch-none",
                selectedProjectId === project.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-accent/50 hover:border-primary/30"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        {getSourceIcon(project.source)}
                    </div>
                    <div className="min-w-0 flex-1">
                        <TruncateTooltip className="font-medium text-sm">{project.name}</TruncateTooltip>
                        <TruncateTooltip
                            className="text-xs text-muted-foreground"
                            content={project.path}
                        >
                            {project.path.split('/').pop()}
                        </TruncateTooltip>
                    </div>
                </div>
                <div className={cn("opacity-0 group-hover:opacity-100 transition-opacity flex items-center", selectedProjectId === project.id ? "opacity-100" : "")}>
                    <DropdownMenu>
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                                            <MoreVertical className="w-3.5 h-3.5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                </TooltipTrigger>
                                <TooltipContent>더보기</TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditModal(project) }}>
                                <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteClick(project.id)
                                }}
                                className="text-destructive focus:text-destructive"
                            >
                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </div>
    )
}

export function ProjectsPage() {
    const queryClient = useQueryClient()

    // --- State ---
    const [selectedProjectId, setSelectedProjectId] = useState<string | null>('global')
    // const [searchQuery, setSearchQuery] = useState('') // Hidden for now (RB-43)
    const searchQuery = '' // Placeholder until search is re-enabled (RB-43)
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [projectToEdit, setProjectToEdit] = useState<UserProject | null>(null)

    const [newProject, setNewProject] = useState<Partial<UserProject>>({
        name: '',
        path: '',
        source: 'vscode'
    });

    // --- Queries ---
    const { data: projects = [], isLoading: isProjectsLoading } = useQuery({
        queryKey: ['projects'],
        queryFn: fetchProjects
    })

    const { data: toolMetadata = [], isLoading: isMetaLoading } = useQuery({
        queryKey: ['toolMetadata'],
        queryFn: fetchToolMetadata
    })

    const { data: installedTools = [] } = useQuery({
        queryKey: ['tools'],
        queryFn: fetchTools
    })

    const { data: projectDetails, isLoading: isDetailsLoading } = useQuery({
        queryKey: ['projectDetails', selectedProjectId],
        queryFn: () => selectedProjectId && selectedProjectId !== 'global' ? fetchProjectDetails(selectedProjectId) : null,
        enabled: !!selectedProjectId && selectedProjectId !== 'global'
    })

    // --- Sorting & Drag-Drop ---
    const {
        sortMode,
        setSortMode,
        sortedItems: sortedProjects,
        handleDragEnd,
        sensors,
        isDragEnabled
    } = useSortableList<UserProject>({
        items: projects,
        onReorder: async (ids) => {
            await reorderProjects(ids)
            queryClient.invalidateQueries({ queryKey: ['projects'] })
        },
        getName: (item) => item.name,
        // Projects might not have explicit createdAt/updatedAt types in api.ts, fallback to current time
        getCreatedAt: (item) => (item as any).createdAt || new Date().toISOString(),
        getUpdatedAt: (item) => (item as any).updatedAt || new Date().toISOString(),
        getOrderIndex: (item) => (item as any).orderIndex,
    })

    // --- Mutations ---
    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: (newProject) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setIsCreateOpen(false)
            resetForm()
            toast.success('Project created successfully')
            setSelectedProjectId(newProject.id)
        },
        onError: (error) => toast.error(`Failed to create: ${getErrorMessage(error)}`)
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, updates }: { id: string, updates: Partial<UserProject> }) =>
            updateProject(id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            setIsEditOpen(false)
            setProjectToEdit(null)
            resetForm()
            toast.success('Project updated successfully')
        },
        onError: (error) => toast.error(`Failed to update: ${getErrorMessage(error)}`)
    })

    const deleteMutation = useMutation({
        mutationFn: deleteProject,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            toast.success('Project deleted')
            if (selectedProjectId === deleteMutation.variables) {
                setSelectedProjectId('global')
            }
        },
        onError: (error) => toast.error(`Failed to delete: ${getErrorMessage(error)}`)
    })

    const scanMutation = useMutation({
        mutationFn: scanProjects,
        onSuccess: (data) => {
            queryClient.setQueryData(['projects'], data)
            toast.success(`Scan complete. Found ${data.length} projects.`)
        },
        onError: (error) => toast.error(`Scan failed: ${getErrorMessage(error)}`)
    })

    // --- Handlers ---
    const resetForm = () => {
        setNewProject({ name: '', path: '', source: 'vscode' });
    }

    const handleCreate = () => {
        if (!newProject.name || !newProject.path) {
            toast.error('Name and Path are required')
            return
        }
        createMutation.mutate(newProject)
    }

    const handleEdit = () => {
        if (!projectToEdit || !newProject.name || !newProject.path) return
        updateMutation.mutate({
            id: projectToEdit.id,
            updates: newProject
        })
    }

    const handleBrowse = async () => {
        try {
            const result = await pickProjectFolder()
            if (result.path) {
                const name = result.path.replace(/[/\\]$/, '').split(/[/\\]/).pop() || 'My Project'
                setNewProject(prev => ({
                    ...prev,
                    path: result.path!,
                    name: prev.name || name // Only auto-fill name if empty
                }))
            }
        } catch (error) {
            toast.error('Failed to open folder picker')
            console.error(error)
        }
    }

    const openEditModal = (project: UserProject) => {
        setProjectToEdit(project)
        setNewProject({
            name: project.name,
            path: project.path,
            source: project.source
        })
        setIsEditOpen(true)
    }

    const handleDeleteClick = (id: string) => {
        if (confirm('Are you sure you want to delete this project?')) {
            deleteMutation.mutate(id)
        }
    }

    // --- Render Helpers ---
    const filteredProjects = sortedProjects.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.path.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const getToolInfo = (meta: ToolMetadata) => {
        const tool = installedTools.find(t => t.id === meta.id)
        return {
            installed: tool?.exists ?? false,
            configPath: tool?.configPath || meta.configPaths[0] || 'N/A',
            format: meta.format
        }
    }

    const isLoading = isProjectsLoading || isMetaLoading;
    if (isLoading) return <LoadingState text="Loading projects..." />;


    const selectedProject = projects.find(p => p.id === selectedProjectId)
    const isGlobal = selectedProjectId === 'global'

    return (
        <div className="h-full flex flex-col overflow-hidden bg-background">
            <div className="flex-1 min-h-0 overflow-hidden p-6">
                <div className="h-full flex flex-col">
                    <div className="flex gap-6 h-full w-full">
                        {/* Left: Projects List */}
                        <div className="w-80 flex-shrink-0 flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                            <div className="p-4 border-b bg-muted/40 flex flex-col gap-3 shrink-0">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-sm flex items-center gap-2">
                                        <Briefcase className="w-4 h-4" /> Projects
                                    </h3>
                                    <div className="flex gap-1 items-center">
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => scanMutation.mutate()}>
                                                        <RefreshCw className={cn("w-3.5 h-3.5", scanMutation.isPending && "animate-spin")} />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>프로젝트 스캔</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <TooltipProvider>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => { resetForm(); setIsCreateOpen(true) }}>
                                                        <Plus className="w-4 h-4" />
                                                    </Button>
                                                </TooltipTrigger>
                                                <TooltipContent>프로젝트 추가</TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                        <SortMenu currentSort={sortMode} onSortChange={setSortMode} className="-mr-1" />
                                    </div>
                                </div>
                                {/* Search Input - Hidden for now (RB-43) */}
                                {/* <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input
                                        placeholder="Search..."
                                        className="pl-8 h-8 text-xs"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div> */}
                            </div>

                            <div className="p-3 flex-1 flex flex-col min-h-0">
                                <ScrollArea className="flex-1">
                                    <div className="space-y-2 pr-2.5">
                                        {/* Global Item */}
                                        <div
                                            onClick={() => setSelectedProjectId('global')}
                                            className={cn(
                                                "group relative px-3 py-3 rounded-lg border transition-all duration-200 cursor-pointer",
                                                selectedProjectId === 'global'
                                                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                                    : "border-border bg-muted/40 hover:bg-muted/60 hover:border-primary/30"
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0 text-secondary">
                                                    <Globe className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="font-medium text-sm">Global Settings</div>
                                                    <div className="text-xs text-muted-foreground">System Default</div>
                                                </div>
                                            </div>
                                        </div>

                                        <Separator className="my-2" />

                                        {/* Project Items */}
                                        <DndContext
                                            sensors={sensors}
                                            collisionDetection={closestCenter}
                                            onDragEnd={handleDragEnd}
                                        >
                                            <SortableContext
                                                items={filteredProjects.map(p => p.id)}
                                                strategy={verticalListSortingStrategy}
                                            >
                                                {filteredProjects.map(project => (
                                                    <SortableProjectItem
                                                        key={project.id}
                                                        project={project}
                                                        selectedProjectId={selectedProjectId}
                                                        setSelectedProjectId={setSelectedProjectId}
                                                        openEditModal={openEditModal}
                                                        handleDeleteClick={handleDeleteClick}
                                                        isDragEnabled={isDragEnabled}
                                                    />
                                                ))}
                                            </SortableContext>
                                        </DndContext>
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>

                        {/* Right: Details */}
                        <Card className="flex-1 flex flex-col h-full border-none shadow-lg overflow-hidden bg-background">
                            {isGlobal ? (
                                <>
                                    <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b shrink-0 bg-muted/20">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-secondary/10 text-secondary">
                                                <Globe className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold">Global Configuration</CardTitle>
                                                <CardDescription>Overview of all supported tools and their global settings</CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <div className="flex-1 overflow-y-auto p-8">
                                        <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                <div className="col-span-4">Tool Name</div>
                                                <div className="col-span-8">Config Paths</div>
                                            </div>
                                            <div className="divide-y">
                                                {toolMetadata
                                                    .filter(meta => {
                                                        const info = getToolInfo(meta)
                                                        const hasRules = meta.rulesFilename && meta.globalRulesDir
                                                        const hasMcp = info.configPath && info.configPath !== 'N/A'
                                                        return hasRules || hasMcp
                                                    })
                                                    .map(meta => {
                                                        const info = getToolInfo(meta)
                                                        const hasRules = meta.rulesFilename && meta.globalRulesDir
                                                        const hasMcp = info.configPath && info.configPath !== 'N/A'
                                                        return (
                                                            <div key={meta.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors text-sm">
                                                                <div className="col-span-4 font-medium flex items-center gap-2">
                                                                    <div className={cn("w-2 h-2 rounded-full", info.installed ? "bg-green-500" : "bg-gray-300")} />
                                                                    {meta.name}
                                                                </div>
                                                                <div className="col-span-8 text-xs text-muted-foreground space-y-1 font-mono">
                                                                    {hasRules && (
                                                                        <div className="flex items-center gap-1.5" title="Global Rules Path">
                                                                            <FileJson className="w-3 h-3 text-orange-500" />
                                                                            <span className="truncate">
                                                                                {`${meta.globalRulesDir}/${meta.rulesFilename}`}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                    {hasMcp && (
                                                                        <div className="flex items-center gap-1.5" title="Global MCP Path">
                                                                            <Settings className="w-3 h-3 text-blue-500" />
                                                                            <span className="truncate">
                                                                                {info.configPath}
                                                                            </span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : selectedProject ? (
                                <>
                                    <CardHeader className="flex flex-row items-center justify-between py-6 px-8 border-b shrink-0 bg-muted/20">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-primary/10 text-primary">
                                                {getSourceIcon(selectedProject.source)}
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl font-bold">{selectedProject.name}</CardTitle>
                                                <CardDescription className="font-mono flex items-center gap-2 mt-1">
                                                    {selectedProject.path}
                                                </CardDescription>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={() => openEditModal(selectedProject)}>
                                            <Edit className="w-4 h-4 mr-2" /> Edit Project
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="flex-1 overflow-y-auto p-8">

                                        <div className="grid gap-6">
                                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                                    <div className="col-span-4">Tool</div>
                                                    <div className="col-span-8">Detected Files</div>
                                                </div>
                                                <div className="divide-y">
                                                    {isDetailsLoading ? (
                                                        <LoadingState text="Loading details..." className="py-8 min-h-[150px]" />
                                                    ) : projectDetails?.tools && projectDetails.tools.length > 0 ? (
                                                        projectDetails.tools.map((tool) => (
                                                            <div key={tool.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors text-sm">
                                                                <div className="col-span-4 font-medium">{tool.name}</div>
                                                                <div className="col-span-8 text-xs font-mono text-muted-foreground">
                                                                    {tool.files.map((f, i) => {
                                                                        // Calculate relative path
                                                                        let displayPath = f.path;
                                                                        if (selectedProject?.path && f.path.startsWith(selectedProject.path)) {
                                                                            let relative = f.path.slice(selectedProject.path.length);
                                                                            if (relative.startsWith('/')) relative = relative.slice(1);

                                                                            // If it's empty, it means it IS the project root (unlikely for a config file but possible for a dir)
                                                                            // or if it's just a filename, we want ./filename
                                                                            if (relative === '') {
                                                                                displayPath = './';
                                                                            } else {
                                                                                displayPath = `./${relative}`;
                                                                            }
                                                                        }
                                                                        return (
                                                                            <div key={i} className="flex items-center gap-1.5 mb-1 last:mb-0">
                                                                                <FileJson className="w-3 h-3" />
                                                                                <span className={f.exists ? "text-foreground" : "text-muted-foreground/50"}>
                                                                                    {displayPath}
                                                                                </span>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <EmptyState
                                                            icon={Box}
                                                            title="No Tools Detected"
                                                            description="We couldn't find any supported AI tools in this project."
                                                            className="py-8"
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center">
                                    <EmptyState
                                        icon={FolderOpen}
                                        title="No Project Selected"
                                        description="Select a project from the list or create a new one to get started."
                                    />
                                </div>
                            )}
                        </Card>
                    </div>

                    {/* Create Modal - Reused Logic */}
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Project</DialogTitle>
                                <DialogDescription>
                                    Enter the path to your project folder.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="path">Project Path</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="path"
                                            value={newProject.path}
                                            onChange={e => setNewProject(d => ({ ...d, path: e.target.value }))}
                                            placeholder="/path/to/project"
                                            className="flex-1"
                                        />
                                        <Button variant="outline" onClick={handleBrowse}>
                                            <FolderOpen className="w-4 h-4 mr-2" />
                                            Browse
                                        </Button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <Label htmlFor="name">Project Name</Label>
                                    <Input
                                        id="name"
                                        value={newProject.name}
                                        onChange={e => setNewProject(d => ({ ...d, name: e.target.value }))}
                                        placeholder="My Awesome Project"
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={!newProject.path || createMutation.isPending}>
                                    {createMutation.isPending ? 'Adding...' : 'Add Project'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Modal */}
                    <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Project</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label>Project Name</Label>
                                    <Input
                                        value={newProject.name}
                                        onChange={e => setNewProject(d => ({ ...d, name: e.target.value }))}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Path</Label>
                                    <Input
                                        value={newProject.path}
                                        onChange={e => setNewProject(d => ({ ...d, path: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                                <Button onClick={handleEdit} disabled={updateMutation.isPending}>Save Changes</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}
