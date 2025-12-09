import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { addTool } from '../lib/api'
import { toast } from 'sonner'
import { Spinner } from './ui/Spinner'

interface AddToolModalProps {
    isOpen: boolean
    onClose: () => void
}

export function AddToolModal({ isOpen, onClose }: AddToolModalProps) {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')
    const [configPath, setConfigPath] = useState('')
    const [description, setDescription] = useState('')

    const mutation = useMutation({
        mutationFn: addTool,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tools'] })
            toast.success('Tool added successfully')
            handleClose()
        },
        onError: (error: Error) => {
            toast.error(`Failed to add tool: ${error.message}`)
        }
    })

    const handleClose = () => {
        setName('')
        setConfigPath('')
        setDescription('')
        onClose()
    }

    const handleSubmit = () => {
        if (!name.trim() || !configPath.trim()) return
        mutation.mutate({ name, configPath, description })
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Add New Tool</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. My Custom Tool"
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="configPath">Config Path</Label>
                        <Input
                            id="configPath"
                            value={configPath}
                            onChange={(e) => setConfigPath(e.target.value)}
                            placeholder="/path/to/config.json"
                        />
                        <p className="text-xs text-muted-foreground">
                            Absolute path to the configuration file
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Brief description of the tool"
                        />
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={handleClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!name.trim() || !configPath.trim() || mutation.isPending}>
                        {mutation.isPending && <Spinner size={16} className="mr-2" />}
                        Add Tool
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
