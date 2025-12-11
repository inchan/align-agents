
import { useState } from 'react'
import { Plus, Trash2, Edit, FileCode, Layers, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { EmptyState } from '@/components/shared/empty-state'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Mock Data Type for Rule Piece
interface RulePiece {
    id: string;
    name: string;
    content: string;
    category: string;
}

// Temporary Mock Data (Until backend support)
const MOCK_PIECES: RulePiece[] = [
    { id: '1', name: 'React Best Practices', content: 'Use functional components...', category: 'Frontend' },
    { id: '2', name: 'FastAPI Validation', content: 'Use Pydantic models...', category: 'Backend' },
    { id: '3', name: 'Jest Testing', content: 'Describe blocks should...', category: 'Testing' }
]

export function RuleLibraryPage() {
    const [pieces, setPieces] = useState<RulePiece[]>(MOCK_PIECES)
    const [searchQuery, setSearchQuery] = useState('')

    // Edit/Create State
    const [isEditOpen, setIsEditOpen] = useState(false)
    const [editingPiece, setEditingPiece] = useState<RulePiece | null>(null)
    const [formData, setFormData] = useState<Partial<RulePiece>>({ name: '', content: '', category: '' })

    // Delete State
    const [deleteId, setDeleteId] = useState<string | null>(null)

    const filteredPieces = pieces.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleOpenEdit = (piece?: RulePiece) => {
        if (piece) {
            setEditingPiece(piece)
            setFormData({ name: piece.name, content: piece.content, category: piece.category })
        } else {
            setEditingPiece(null)
            setFormData({ name: '', content: '', category: '' })
        }
        setIsEditOpen(true)
    }

    const handleSave = () => {
        if (!formData.name || !formData.content) return;

        if (editingPiece) {
            setPieces(pieces.map(p => p.id === editingPiece.id ? { ...p, ...formData } as RulePiece : p))
        } else {
            const newPiece: RulePiece = {
                id: Math.random().toString(36).substr(2, 9),
                name: formData.name!,
                content: formData.content!,
                category: formData.category || 'General'
            }
            setPieces([...pieces, newPiece])
        }
        setIsEditOpen(false)
    }

    const handleDelete = () => {
        if (deleteId) {
            setPieces(pieces.filter(p => p.id !== deleteId))
            setDeleteId(null)
        }
    }

    return (
        <div className="h-full flex flex-col p-6 bg-background space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold">Rule Library</h1>
                    <p className="text-muted-foreground">Manage reusable rule pieces to compose complex rules.</p>
                </div>
                <Button onClick={() => handleOpenEdit()}>
                    <Plus className="w-4 h-4 mr-2" /> New Piece
                </Button>
            </div>

            <div className="flex items-center gap-2 max-w-md">
                <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search pieces..."
                        className="pl-9"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredPieces.map(piece => (
                        <Card key={piece.id} className="hover:shadow-md transition-all group">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <FileCode className="w-4 h-4 text-primary" />
                                    {piece.name}
                                </CardTitle>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenEdit(piece)}>
                                                    <Edit className="w-3.5 h-3.5 text-muted-foreground" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>편집</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(piece.id)}>
                                                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>삭제</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="text-xs text-muted-foreground mb-2 px-2 py-0.5 bg-muted rounded inline-block">
                                    {piece.category}
                                </div>
                                <div className="text-xs font-mono bg-muted/40 p-2 rounded h-24 overflow-hidden text-muted-foreground relative">
                                    {piece.content}
                                    <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-muted/40 to-transparent" />
                                </div>
                            </CardContent>
                        </Card>
                    ))}

                    {filteredPieces.length === 0 && (
                        <div className="col-span-full py-12">
                            <EmptyState
                                icon={Layers}
                                title="No Rule Pieces Found"
                                description="Create your first reusable rule piece."
                                action={
                                    <Button onClick={() => handleOpenEdit()}>
                                        <Plus className="w-4 h-4 mr-2" /> Create Piece
                                    </Button>
                                }
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle>{editingPiece ? 'Edit Rule Piece' : 'New Rule Piece'}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Name</Label>
                            <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g. React Hook Rules" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Category</Label>
                            <Input value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Frontend" />
                        </div>
                        <div className="grid gap-2">
                            <Label>Content (Markdown)</Label>
                            <Textarea
                                value={formData.content}
                                onChange={e => setFormData({ ...formData, content: e.target.value })}
                                placeholder="# Rules..."
                                className="h-64 font-mono text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                        <Button onClick={handleSave}>Save</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Rule Piece</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this rule piece? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
