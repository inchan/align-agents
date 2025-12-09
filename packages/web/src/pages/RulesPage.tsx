import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRulesList, createRule, updateRule, deleteRule, type Rule } from '../lib/api'
import { useState, useEffect } from 'react'

import { toast } from 'sonner'
import { Spinner } from '../components/ui/Spinner'
import { getErrorMessage, cn } from '../lib/utils'
import { Plus, Trash2, Save, FileText, X, GripVertical } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TruncateTooltip } from '@/components/ui/truncate-tooltip'

interface SortableRuleItemProps {
    rule: Rule
    viewedRuleId: string | null
    setViewedRuleId: (id: string) => void
    setIsEditing: (editing: boolean) => void
    handleDeleteClick: (id: string, name: string) => void
}

function SortableRuleItem({ rule, viewedRuleId, setViewedRuleId, setIsEditing, handleDeleteClick }: SortableRuleItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: rule.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    }

    return (
        <div
            ref={setNodeRef}
            style={style}
            onClick={() => {
                setViewedRuleId(rule.id)
                setIsEditing(false)
            }}
            className={cn(
                "group relative px-3 py-2.5 rounded-lg border transition-all duration-200 cursor-pointer",
                viewedRuleId === rule.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-muted/40 hover:bg-muted/60 hover:border-primary/30 hover:shadow-sm"
            )}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div
                        {...attributes}
                        {...listeners}
                        className="cursor-grab active:cursor-grabbing shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="min-w-0 flex-1">
                        <TruncateTooltip className="font-medium text-sm transition-colors">
                            {rule.name}
                        </TruncateTooltip>
                        <div className="text-xs text-muted-foreground mt-0.5">
                            {new Date(rule.updatedAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>

                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
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

export function RulesPage() {
    const queryClient = useQueryClient()

    const [viewedRuleId, setViewedRuleId] = useState<string | null>(null)
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

    // Set default viewed rule to active rule
    // Set default viewed rule to active rule only when initializing or rules list changes
    useEffect(() => {
        if (rulesList.length > 0 && !viewedRuleId) {
            const active = rulesList.find(r => r.isActive) || rulesList[0]
            if (active) {
                setViewedRuleId(active.id)
            }
        }
    }, [rulesList, viewedRuleId])

    // Derived state for the view
    const activeRule = rulesList.find(r => r.isActive)
    // If viewedRuleId is set, find that rule. If not, fallback to active or first.
    // This removes the need for the effect above entirely for READ purposes.
    // However, the "Edit" functionality relies on `viewedRule`.
    // Let's change the selection logic.

    const targetRuleId = viewedRuleId || activeRule?.id || rulesList[0]?.id;
    const viewedRule = rulesList.find(r => r.id === targetRuleId);

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
            if (viewedRuleId === deleteMutation.variables) {
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

    // Drag and drop sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8, // 8px movement required to start drag
            },
        })
    )

    // Handle drag end
    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = rulesList.findIndex(r => r.id === active.id)
            const newIndex = rulesList.findIndex(r => r.id === over.id)

            const newOrder = arrayMove(rulesList, oldIndex, newIndex)

            // Update local state immediately for smooth UX
            queryClient.setQueryData(['rulesList'], newOrder)

            // TODO: Call API to persist the new order
            // For now, the order will reset on page refresh
            toast.success('Rule order updated')
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
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => setIsCreateModalOpen(true)}>
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </div>
                            <div className="p-3 flex-1 flex flex-col min-h-0">
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={rulesList.map(r => r.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                                            {rulesList.map(rule => (
                                                <SortableRuleItem
                                                    key={rule.id}
                                                    rule={rule}
                                                    viewedRuleId={viewedRuleId}
                                                    setViewedRuleId={setViewedRuleId}
                                                    setIsEditing={setIsEditing}
                                                    handleDeleteClick={handleDeleteClick}
                                                />
                                            ))}
                                        </div>
                                    </SortableContext>
                                </DndContext>
                            </div>
                        </div>

                        {/* Right: Editor */}
                        <Card className="flex-1 flex flex-col h-full border-none shadow-lg overflow-hidden">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-4 px-6 border-b shrink-0 bg-muted/40">
                                <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                                        <FileText className="w-4 h-4" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base font-semibold">
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
                                            <Textarea
                                                value={editedContent}
                                                onChange={(e) => setEditedContent(e.target.value)}
                                                className="flex-1 font-mono text-sm resize-none border-0 focus-visible:ring-0 rounded-none p-6 leading-relaxed"
                                                placeholder="Enter rule content..."
                                            />
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
                                    <Textarea
                                        id="ruleContent"
                                        value={newRuleContent}
                                        onChange={(e) => setNewRuleContent(e.target.value)}
                                        placeholder="Enter rule content..."
                                        className="min-h-[180px] font-mono text-sm"
                                    />
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
