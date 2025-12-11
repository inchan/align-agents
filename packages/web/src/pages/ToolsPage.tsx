import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
    fetchTools, addTool, deleteTool, checkToolHelp,
    type ToolConfig
} from '../lib/api' // Added ToolConfig
import { useState, useEffect } from 'react'
import { Skeleton } from '../components/ui/Skeleton'
import { ConfigEditorModal } from '../components/ConfigEditorModal'
import {
    Plus, Trash2, Server, Settings, FileJson,
    Terminal, HelpCircle, MoreVertical, ExternalLink
} from 'lucide-react'
import { Button } from '../components/ui/button'
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '../components/ui/dialog'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "../components/ui/dropdown-menu"
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { toast } from 'sonner'
import { getErrorMessage } from '../lib/utils'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import { Spinner } from '../components/ui/Spinner'

const isCustomTool = (tool: ToolConfig) => {
    return !['cursor', 'vscode', 'windsurf', 'claude-desktop', 'zed'].includes(tool.id) && !tool.id.startsWith('cursor-') && !tool.id.startsWith('vscode-')
}

function AddToolModal({
    open,
    onOpenChange,
    onAdd,
    isSubmitting
}: {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    onAdd: (tool: any) => void,
    isSubmitting: boolean
}) {
    const [name, setName] = useState('')
    const [configPath, setConfigPath] = useState('')
    const [rulesPath, setRulesPath] = useState('')
    const [mcpPath, setMcpPath] = useState('')
    const [description, setDescription] = useState('')

    // Reset when opening
    // Reset when opening - handled by a key on the parent or just use this effect responsibly
    // Since this is a Dialog content, usually it unmounts.
    // But if it stays mounted, we should reset.
    // The lint error is complaining about setState in effect causing immediate re-render.
    // We can just rely on the parent to unmount it, or check for `open` transition.
    useEffect(() => {
        if (open) {
            // These updates are batched in React 18, so it's mostly fine, but the linter is strict.
            // We can check if it's already empty to avoid redundant updates?
            // Or better: Just do nothing if the values are already default.
            if (name || configPath || rulesPath || mcpPath || description) {
                setName('')
                setConfigPath('')
                setRulesPath('')
                setMcpPath('')
                setDescription('')
            }
        }
    }, [open])

    const handleSubmit = () => {
        onAdd({ name, configPath, rulesPath, mcpPath, description })
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add Custom Tool</DialogTitle>
                    <DialogDescription>
                        Register a new tool manually by providing its configuration paths.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Tool Name</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. My Custom CLI" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Config Path (Optional)</Label>
                        <Input value={configPath} onChange={e => setConfigPath(e.target.value)} placeholder="/path/to/config.json" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Rules Path (Optional)</Label>
                        <Input value={rulesPath} onChange={e => setRulesPath(e.target.value)} placeholder="/path/to/.cursorrules or rules file" />
                    </div>
                    <div className="grid gap-2">
                        <Label>MCP Config Path (Optional)</Label>
                        <Input value={mcpPath} onChange={e => setMcpPath(e.target.value)} placeholder="/path/to/mcp_config.json" />
                    </div>
                    <div className="grid gap-2">
                        <Label>Description</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Tool description" />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name || isSubmitting}>
                        {isSubmitting ? 'Adding...' : 'Add Tool'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

function HelpModal({
    isOpen,
    onClose,
    toolName,
    helpOutput,
    isLoading
}: {
    isOpen: boolean,
    onClose: () => void,
    toolName: string,
    helpOutput: string,
    isLoading: boolean
}) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Terminal className="w-5 h-5" />
                        {toolName} --help
                    </DialogTitle>
                </DialogHeader>
                <div className="flex-1 min-h-0 bg-muted/50 rounded-md border p-4 font-mono text-xs overflow-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <Spinner size={24} />
                        </div>
                    ) : (
                        <pre className="whitespace-pre-wrap">{helpOutput}</pre>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export function ToolsPage() {
    // --- State ---
    const [isAddOpen, setIsAddOpen] = useState(false)
    const [viewingConfig, setViewingConfig] = useState<ToolConfig | null>(null)

    // Help Check State
    const [helpModalOpen, setHelpModalOpen] = useState(false)
    const [helpOutput, setHelpOutput] = useState('')
    const [helpLoading, setHelpLoading] = useState(false)
    const [helpToolName, setHelpToolName] = useState('')

    const queryClient = useQueryClient()

    // --- Mutations ---
    const addMutation = useMutation({
        mutationFn: addTool,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tools'] })
            setIsAddOpen(false)
            toast.success('Tool added')
        },
        onError: (error) => toast.error(`Failed: ${getErrorMessage(error)}`)
    })

    const deleteMutation = useMutation({
        mutationFn: deleteTool,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tools'] })
            toast.success('Tool deleted')
        },
        onError: (error) => toast.error(`Failed to delete: ${getErrorMessage(error)}`)
    })

    const checkHelpMutation = useMutation({
        mutationFn: checkToolHelp,
        onMutate: () => {
            setHelpLoading(true)
            setHelpOutput('')
            setHelpModalOpen(true)
        },
        onSuccess: (data) => {
            setHelpOutput(data)
            setHelpLoading(false)
        },
        onError: (error) => {
            setHelpOutput(`Error: ${getErrorMessage(error)}`)
            setHelpLoading(false)
        }
    })

    const { data, isLoading } = useQuery({
        queryKey: ['tools'],
        queryFn: fetchTools,
    })

    const handleEditConfig = (tool: ToolConfig) => { // Typed 'tool'
        setViewingConfig(tool)
    }

    const handleCheckHelp = (tool: ToolConfig) => {
        setHelpToolName(tool.name)
        checkHelpMutation.mutate(tool.id)
    }

    const handleOpenMcp = () => {
        window.location.hash = '#/mcp'
    }

    if (isLoading) {
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold">도구 관리</h1>
                        <p className="text-muted-foreground">설치된 AI 도구의 설정을 관리하고 동기화합니다.</p>
                    </div>
                    <Skeleton className="h-10 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="card">
                            <Skeleton className="h-6 w-32 mb-3" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-10 w-full mt-4" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    const tools = (data || []).sort((a, b) => {
        if (a.exists && !b.exists) return -1
        if (!a.exists && b.exists) return 1
        return a.name.localeCompare(b.name)
    })

    return (
        <div>
            <AddToolModal
                open={isAddOpen}
                onOpenChange={setIsAddOpen}
                onAdd={addMutation.mutate}
                isSubmitting={addMutation.isPending}
            />
            {viewingConfig && (
                <ConfigEditorModal
                    isOpen={!!viewingConfig}
                    onClose={() => setViewingConfig(null)}
                    toolName={viewingConfig.name}
                    configPath={viewingConfig.configPath}
                />
            )}

            <HelpModal
                isOpen={helpModalOpen}
                onClose={() => setHelpModalOpen(false)}
                toolName={helpToolName}
                helpOutput={helpOutput}
                isLoading={helpLoading}
            />

            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold">도구 관리</h1>
                    <p className="text-muted-foreground">설치된 AI 도구의 설정을 관리하고 동기화합니다.</p>
                </div>
                <Button onClick={() => setIsAddOpen(true)} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Add Tool
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tools.map((tool) => (
                    <div key={tool.name} className="card hover:shadow-lg transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg">{tool.name}</h3>
                            <div className="flex items-center gap-2">
                                {isCustomTool(tool) && (
                                    <span className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded text-[10px] font-medium flex items-center gap-1 border border-secondary-foreground/20">
                                        <Server className="w-3 h-3" /> Custom
                                    </span>
                                )}
                                <div className={`w-3 h-3 rounded-full ${tool.exists ? 'bg-primary' : 'bg-muted'}`}
                                    title={tool.exists ? '설치됨' : '미설치'} />
                                <DropdownMenu>
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                            </TooltipTrigger>
                                            <TooltipContent>옵션</TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                    <DropdownMenuContent align="end">
                                        {tool.configPath && (
                                            <DropdownMenuItem onClick={() => handleEditConfig(tool)}>
                                                <FileJson className="mr-2 h-4 w-4" /> Edit Config
                                            </DropdownMenuItem>
                                        )}
                                        {tool.exists && (
                                            <DropdownMenuItem onClick={() => handleCheckHelp(tool)}>
                                                <HelpCircle className="mr-2 h-4 w-4" /> Check Help
                                            </DropdownMenuItem>
                                        )}
                                        {tool.id === 'claude-desktop' && (
                                            <DropdownMenuItem onClick={() => handleOpenMcp()}>
                                                <ExternalLink className="mr-2 h-4 w-4" /> Open MCP
                                            </DropdownMenuItem>
                                        )}
                                        {isCustomTool(tool) && (
                                            <DropdownMenuItem onClick={() => deleteMutation.mutate(tool.id)} className="text-red-600 focus:text-red-600 focus:bg-red-100">
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        <div className="mb-4">
                            <div className="text-xs text-muted-foreground mb-1">설정 파일 경로</div>
                            <div
                                className="text-xs font-mono bg-muted p-2 rounded border truncate"
                                title={tool.configPath}
                            >
                                {tool.configPath || 'N/A'}
                            </div>
                        </div>

                        {tool.exists ? (
                            <div className="flex gap-2">
                                <Button
                                    className="flex-1"
                                    onClick={() => handleEditConfig(tool)}
                                    data-testid={`edit-config-${tool.id}`}
                                    disabled={!tool.configPath}
                                >
                                    <Settings size={14} className="mr-2" /> 설정 편집
                                </Button>
                            </div>
                        ) : (
                            <div className="badge badge-neutral w-full text-center py-2">
                                미설치
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
