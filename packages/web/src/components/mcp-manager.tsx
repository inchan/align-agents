import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchConfig, saveConfig } from '@/lib/api'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RefreshCw, Plus, Trash2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface McpManagerProps {
    isOpen: boolean
    onClose: () => void
    configPath: string | null
    toolName: string | null
}

interface McpServerConfig {
    command: string
    args: string[]
    env?: Record<string, string>
}

export function McpManager({ isOpen, onClose, configPath, toolName }: McpManagerProps) {
    const queryClient = useQueryClient()
    const [servers, setServers] = useState<Record<string, McpServerConfig>>({})
    const [newServerName, setNewServerName] = useState('')
    const [newServerCommand, setNewServerCommand] = useState('')
    const [newServerArgs, setNewServerArgs] = useState('')

    const { data, isLoading, error } = useQuery({
        queryKey: ['config', configPath],
        queryFn: () => fetchConfig(configPath!),
        enabled: !!configPath && isOpen,
    })

    // React Query v5 - onSuccess removed, use useEffect instead
    useEffect(() => {
        if (data) {
            try {
                const json = JSON.parse(data.content)
                setServers(json.mcpServers || {})
            } catch (e: unknown) {
                console.error('Failed to parse config JSON', e)
                setServers({})
            }
        }
    }, [data])

    const mutation = useMutation({
        mutationFn: async (newServers: Record<string, McpServerConfig>) => {
            if (!configPath || !data?.content) return

            try {
                const json = JSON.parse(data.content)
                json.mcpServers = newServers
                await saveConfig(configPath, JSON.stringify(json, null, 2))
            } catch (e: unknown) {
                console.error('Failed to update config', e)
                throw e
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config', configPath] })
        },
    })

    const handleAddServer = () => {
        if (!newServerName || !newServerCommand) return

        const args = newServerArgs.split(' ').filter(arg => arg.trim().length > 0)

        const newServers = {
            ...servers,
            [newServerName]: {
                command: newServerCommand,
                args: args
            }
        }

        setServers(newServers)
        mutation.mutate(newServers)

        // Reset form
        setNewServerName('')
        setNewServerCommand('')
        setNewServerArgs('')
    }

    const handleDeleteServer = (name: string) => {
        const newServers = { ...servers }
        delete newServers[name]
        setServers(newServers)
        mutation.mutate(newServers)
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Manage MCP Servers</DialogTitle>
                    <DialogDescription>
                        Add or remove MCP servers for {toolName}.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {isLoading ? (
                        <div className="flex justify-center p-4">
                            <RefreshCw className="h-6 w-6 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex items-center gap-2 text-destructive justify-center p-4">
                            <AlertCircle className="h-6 w-6" />
                            <p>Failed to load configuration</p>
                        </div>
                    ) : (
                        <>
                            {/* Add New Server Form */}
                            <Card className="bg-muted/30">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-medium">Add New Server</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Server Name</Label>
                                            <Input
                                                id="name"
                                                placeholder="e.g. filesystem"
                                                value={newServerName}
                                                onChange={(e) => setNewServerName(e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="command">Command</Label>
                                            <Input
                                                id="command"
                                                placeholder="e.g. npx, node, python"
                                                value={newServerCommand}
                                                onChange={(e) => setNewServerCommand(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="args">Arguments</Label>
                                        <Input
                                            id="args"
                                            placeholder="-y @modelcontextprotocol/server-filesystem /path/to/dir"
                                            value={newServerArgs}
                                            onChange={(e) => setNewServerArgs(e.target.value)}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleAddServer}
                                        disabled={!newServerName || !newServerCommand || mutation.isPending}
                                        className="w-full"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Server
                                    </Button>
                                </CardContent>
                            </Card>

                            {/* Server List */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium">Configured Servers ({Object.keys(servers).length})</h3>
                                {Object.keys(servers).length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
                                        No MCP servers configured.
                                    </div>
                                ) : (
                                    <div className="grid gap-4">
                                        {Object.entries(servers).map(([name, config]) => (
                                            <div key={name} className="flex items-start justify-between p-4 border rounded-lg bg-card">
                                                <div className="space-y-1">
                                                    <div className="font-semibold flex items-center gap-2">
                                                        {name}
                                                    </div>
                                                    <div className="text-xs font-mono bg-muted px-2 py-1 rounded w-fit">
                                                        {config.command} {config.args.join(' ')}
                                                    </div>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteServer(name)}
                                                    disabled={mutation.isPending}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
