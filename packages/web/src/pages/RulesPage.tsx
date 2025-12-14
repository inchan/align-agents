import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRulesList, createRule, updateRule, deleteRule, reorderRules, setActiveRule, deactivateRule, type Rule } from '../lib/api'
import { useState, useMemo } from 'react'
import Editor, { type EditorProps } from '@monaco-editor/react'

import { toast } from 'sonner'
import { Spinner } from '../components/ui/Spinner'
import { getErrorMessage, cn, getCommonSortableStyle } from '../lib/utils'
import { Plus, Trash2, Save, FileText, X, GripVertical, MoreVertical, Power, PowerOff } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DndContext, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu'

import { TruncateTooltip } from '@/components/ui/truncate-tooltip'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { SortMenu } from '../components/common/SortMenu'
import { useSortableList } from '../hooks/useSortableList'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/shared/empty-state'
import { useTheme } from '../components/theme-provider'

interface SortableRuleItemProps {
    rule: Rule
    viewedRuleId: string | null
    setViewedRuleId: (id: string) => void
    setIsEditing: (editing: boolean) => void
    handleDeleteClick: (id: string, name: string) => void
    handleToggleActive: (id: string, currentIsActive: boolean) => void
    isDragEnabled?: boolean
}

function SortableRuleItem({ rule, viewedRuleId, setViewedRuleId, setIsEditing, handleDeleteClick, handleToggleActive, isDragEnabled }: SortableRuleItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: rule.id,
        disabled: !isDragEnabled
    })

    const style = getCommonSortableStyle(transform, transition, isDragging)

    const isActive = rule.isActive;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={() => {
                setViewedRuleId(rule.id)
                setIsEditing(false)
            }}
            className={cn(
                "group relative px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer touch-none",
                viewedRuleId === rule.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : cn(
                        "border-border hover:shadow-sm",
                        !isActive
                            ? "bg-muted/20 hover:bg-muted/40 opacity-70 grayscale-[0.5]"
                            : "bg-muted/40 hover:bg-muted/60 hover:border-primary/30"
                    )
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                            <TruncateTooltip className={cn("font-medium text-sm transition-colors",
                                viewedRuleId === rule.id ? "text-primary font-semibold" : "",
                                !isActive && "text-muted-foreground line-through decoration-muted-foreground/50"
                            )}>
                                {rule.name}
                            </TruncateTooltip>
                            {!isActive && (
                                <Badge variant="outline" className="h-4 px-1 text-[9px] text-muted-foreground bg-muted/50 border-muted-foreground/20 font-normal">
                                    Disabled
                                </Badge>
                            )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(rule.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className={cn("flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity", viewedRuleId === rule.id ? "opacity-100" : "")}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                                title="More options"
                            >
                                <MoreVertical className="w-3.5 h-3.5" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuItem
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleToggleActive(rule.id, isActive)
                                }}
                            >
                                {isActive ? (
                                    <>
                                        <PowerOff className="w-4 h-4 mr-2" />
                                        Deactivate
                                    </>
                                ) : (
                                    <>
                                        <Power className="w-4 h-4 mr-2" />
                                        Activate
                                    </>
                                )}
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive/80 hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(rule.id, rule.name)
                        }}
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>
        </div>
    )
}

// Hook to provide Monaco Editor configuration with theme support
function useMonacoConfig() {
    const { theme } = useTheme()

    // Determine the Monaco theme based on current app theme
    const monacoTheme = useMemo(() => {
        if (theme === 'dark') return 'vs-dark'
        if (theme === 'light') return 'vs'
        // For 'system' theme, check the actual applied theme
        const isDark = window.document.documentElement.classList.contains('dark')
        return isDark ? 'vs-dark' : 'vs'
    }, [theme])

    // Shared editor options factory
    const getEditorOptions = (variant: 'edit' | 'create'): EditorProps['options'] => ({
        minimap: { enabled: variant === 'edit' },
        lineNumbers: 'on',
        wordWrap: 'on',
        scrollBeyondLastLine: false,
        fontSize: 14,
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
        padding: {
            top: variant === 'edit' ? 16 : 12,
            bottom: variant === 'edit' ? 16 : 12
        },
        scrollbar: {
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
        },
    })

    // Loading component
    const loadingComponent = (
        <div className="flex items-center justify-center h-full">
            <Spinner size={24} />
        </div>
    )

    return { monacoTheme, getEditorOptions, loadingComponent }
}

export function RulesPage() {
    const queryClient = useQueryClient()
    const { monacoTheme, getEditorOptions, loadingComponent } = useMonacoConfig()

    const [userSelectedRuleId, setUserSelectedRuleId] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editedContent, setEditedContent] = useState('')
    const [editedName, setEditedName] = useState('')

    // Create Rule Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [newRuleName, setNewRuleName] = useState('')
    const [newRuleContent, setNewRuleContent] = useState('')

    // Delete Confirmation Dialog State
    const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ isOpen: boolean; ruleId: string | null; ruleName: string }>({
        isOpen: false,
        ruleId: null,
        ruleName: ''
    })

    const { data: rulesList = [], isLoading: rulesLoading } = useQuery<Rule[]>({
        queryKey: ['rulesList'],
        queryFn: fetchRulesList,
    })

    // --- Sorting & Drag-Drop ---
    const {
        sortMode,
        setSortMode,
        sortedItems: sortedRules,
        handleDragEnd,
        sensors,
        isDragEnabled
    } = useSortableList<Rule>({
        items: rulesList,
        onReorder: async (ids) => {
            await reorderRules(ids)
            queryClient.invalidateQueries({ queryKey: ['rulesList'] })
        },
        getName: (item) => item.name,
        getCreatedAt: (item) => item.createdAt || new Date().toISOString(),
        getUpdatedAt: (item) => item.updatedAt || new Date().toISOString(),
        getOrderIndex: (item) => item.orderIndex,
        storageKey: 'rules-list-sort'
    })

    // Derived state for the currently viewed rule
    // If user has selected one (and it still exists), use that.
    // Otherwise, default to the first active rule or simply the first rule.
    const viewedRuleId = useMemo(() => {
        if (userSelectedRuleId && sortedRules.some(r => r.id === userSelectedRuleId)) {
            return userSelectedRuleId
        }
        if (sortedRules.length > 0) {
            return (sortedRules.find(r => r.isActive) || sortedRules[0]).id
        }
        return null
    }, [userSelectedRuleId, sortedRules])

    // Wrapper to maintain API compatibility with children
    const setViewedRuleId = setUserSelectedRuleId

    const viewedRule = rulesList.find(r => r.id === viewedRuleId) || null

    // Mutations
    const createMutation = useMutation({
        mutationFn: ({ name, content }: { name: string, content: string }) => createRule(name, content),
        onSuccess: (newRule) => {
            queryClient.invalidateQueries({ queryKey: ['rulesList'] })
            setIsCreateModalOpen(false)
            setNewRuleName('')
            setNewRuleContent('')
            setViewedRuleId(newRule.id)
            setIsEditing(true)
            setEditedContent(newRule.content)
            toast.success('Rule created successfully')
        },
        onError: (error) => toast.error(`Failed to create: ${getErrorMessage(error)}`)
    })

    const updateMutation = useMutation({
        mutationFn: ({ id, content, name }: { id: string, content: string, name?: string }) => updateRule(id, content, name),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rulesList'] })
            setIsEditing(false)
            toast.success('Rule saved successfully')
        },
        onError: (error) => toast.error(`Failed to save: ${getErrorMessage(error)}`)
    })

    const deleteMutation = useMutation({
        mutationFn: deleteRule,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rulesList'] })
            if (viewedRuleId === deleteConfirmDialog.ruleId) {
                setViewedRuleId(null)
            }
            toast.success('Rule deleted successfully')
            setDeleteConfirmDialog({ isOpen: false, ruleId: null, ruleName: '' })
        },
        onError: (error) => {
            toast.error(`Failed to delete: ${getErrorMessage(error)}`)
            setDeleteConfirmDialog({ isOpen: false, ruleId: null, ruleName: '' })
        }
    })

    const toggleActiveMutation = useMutation({
        mutationFn: async ({ id, currentIsActive }: { id: string; currentIsActive: boolean }) => {
            if (currentIsActive) {
                return deactivateRule(id)
            } else {
                return setActiveRule(id)
            }
        },
        onSuccess: (_, { currentIsActive }) => {
            queryClient.invalidateQueries({ queryKey: ['rulesList'] })
            toast.success(currentIsActive ? 'Rule deactivated' : 'Rule activated')
        },
        onError: (error) => toast.error(`Failed to toggle: ${getErrorMessage(error)}`)
    })

    const handleToggleActive = (id: string, currentIsActive: boolean) => {
        toggleActiveMutation.mutate({ id, currentIsActive })
    }

    const handleCreate = () => {
        if (!newRuleName.trim()) return
        createMutation.mutate({ name: newRuleName, content: newRuleContent })
    }

    const handleEdit = () => {
        if (!viewedRule) return
        setEditedContent(viewedRule.content)
        setEditedName(viewedRule.name)
        setIsEditing(true)
    }

    const handleSave = () => {
        if (!viewedRule) return
        updateMutation.mutate({
            id: viewedRule.id,
            content: editedContent,
            name: editedName
        })
    }

    const handleDeleteClick = (ruleId: string, ruleName: string) => {
        setDeleteConfirmDialog({ isOpen: true, ruleId, ruleName })
    }

    const handleDeleteConfirm = () => {
        if (deleteConfirmDialog.ruleId) {
            deleteMutation.mutate(deleteConfirmDialog.ruleId)
        }
    }

    if (rulesLoading) {
        return <div className="h-full flex items-center justify-center"><Spinner size={32} /></div>
    }

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Main Content: Rules List + Editor */}
            <div className="flex-1 min-h-0 overflow-hidden p-6">
                <div className="h-full flex flex-col">
                    <div className="flex gap-6 h-full w-full">
                        {/* Left: Rules List */}
                        <div className="w-80 flex-shrink-0 flex flex-col min-h-0 border rounded-xl overflow-hidden bg-card/50">
                            <div className="p-4 border-b bg-muted/40 flex items-center justify-between shrink-0">
                                <h3 className="font-semibold text-sm">Rules</h3>
                                <div className="flex items-center gap-1">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsCreateModalOpen(true)}>
                                                    <Plus className="w-4 h-4" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>새 규칙 생성</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <SortMenu currentSort={sortMode} onSortChange={setSortMode} className="-mr-1" />
                                </div>
                            </div>
                            <div className="p-3 flex-1 flex flex-col min-h-0">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={sortedRules.map(r => r.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                                            {sortedRules.map(rule => (
                                                <SortableRuleItem
                                                    key={rule.id}
                                                    rule={rule}
                                                    viewedRuleId={viewedRuleId}
                                                    setViewedRuleId={setViewedRuleId}
                                                    setIsEditing={setIsEditing}
                                                    handleDeleteClick={handleDeleteClick}
                                                    handleToggleActive={handleToggleActive}
                                                    isDragEnabled={isDragEnabled}
                                                />
                                            ))}
                                            {sortedRules.length === 0 && (
                                                <EmptyState
                                                    icon={FileText}
                                                    title="No Rules"
                                                    description="Create a rule to get started."
                                                />
                                            )}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>

                        {/* Right: Editor */}
                        <Card className="flex-1 flex flex-col h-full border-none shadow-lg overflow-hidden bg-card/50">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-6 border-b shrink-0 bg-muted/40 h-[65px]">
                                <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary shrink-0">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <CardTitle className="text-base font-semibold truncate">
                                            {viewedRule?.name || 'No rule selected'}
                                        </CardTitle>
                                    </div>
                                </div>
                                {!isEditing && viewedRule && (
                                    <Button size="sm" variant="outline" onClick={handleEdit}>
                                        Edit
                                    </Button>
                                )}
                            </CardHeader>
                            <CardContent className="flex-1 p-0 overflow-hidden relative">
                                {viewedRule ? (
                                    !isEditing ? (
                                        <div className="h-full overflow-y-auto p-6">
                                            <pre className="text-sm whitespace-pre-wrap font-mono leading-relaxed">
                                                {viewedRule.content || <span className="text-muted-foreground italic">No content. Click Edit to add rules.</span>}
                                            </pre>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col h-full">
                                            <div className="flex flex-col gap-3 px-5 py-3 bg-muted/30 border-b shrink-0">
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor="ruleName" className="text-xs font-medium min-w-[60px]">Name</Label>
                                                    <Input
                                                        id="ruleName"
                                                        value={editedName}
                                                        onChange={(e) => setEditedName(e.target.value)}
                                                        className="flex-1 h-8 text-sm"
                                                        placeholder="Rule name..."
                                                    />
                                                </div>
                                                <div className="flex justify-end items-center">
                                                    <div className="flex gap-2">
                                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                                                            <X className="w-4 h-4 mr-1.5" /> Cancel
                                                        </Button>
                                                        <Button size="sm" onClick={handleSave} disabled={updateMutation.isPending}>
                                                            {updateMutation.isPending ? <Spinner size={14} className="mr-1.5" /> : <Save className="w-4 h-4 mr-1.5" />}
                                                            Save
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div role="region" aria-label="Rule content editor" className="flex-1">
                                                <Editor
                                                    height="100%"
                                                    language="markdown"
                                                    theme={monacoTheme}
                                                    value={editedContent}
                                                    onChange={(value) => setEditedContent(value || '')}
                                                    loading={loadingComponent}
                                                    options={getEditorOptions('edit')}
                                                />
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
                                        <div className="w-14 h-14 rounded-xl bg-muted/50 flex items-center justify-center">
                                            <FileText className="w-7 h-7 opacity-50" />
                                        </div>
                                        <p className="text-sm">Select a rule to view</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Create Rule Modal */}
                    <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                        <DialogContent className="sm:max-w-[550px]">
                            <DialogHeader>
                                <DialogTitle>Create New Rule</DialogTitle>
                                <DialogDescription>
                                    Define a new rule set for your tools
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-5 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="ruleName">Rule Name</Label>
                                    <Input
                                        id="ruleName"
                                        value={newRuleName}
                                        onChange={(e) => setNewRuleName(e.target.value)}
                                        placeholder="e.g., Python Project Rules"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <div className="flex justify-between items-center">
                                        <Label htmlFor="ruleContent">Content</Label>
                                    </div>
                                    <div role="region" aria-label="New rule content editor" className="border rounded-md overflow-hidden h-[300px]">
                                        <Editor
                                            height="100%"
                                            language="markdown"
                                            theme={monacoTheme}
                                            value={newRuleContent}
                                            onChange={(value) => setNewRuleContent(value || '')}
                                            loading={loadingComponent}
                                            options={getEditorOptions('create')}
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                                <Button onClick={handleCreate} disabled={!newRuleName.trim() || createMutation.isPending}>
                                    {createMutation.isPending ? 'Creating...' : 'Create'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>

                    {/* Delete Confirmation Dialog */}
                    <Dialog open={deleteConfirmDialog.isOpen} onOpenChange={(open) => !open && setDeleteConfirmDialog({ isOpen: false, ruleId: null, ruleName: '' })}>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Delete Rule</DialogTitle>
                                <DialogDescription>
                                    Are you sure you want to delete <span className="font-semibold text-foreground">"{deleteConfirmDialog.ruleName}"</span>? This action cannot be undone.
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setDeleteConfirmDialog({ isOpen: false, ruleId: null, ruleName: '' })}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteMutation.isPending}>
                                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>
    )
}
