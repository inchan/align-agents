import { useState } from 'react'
import { Globe, LayoutGrid, FolderOpen } from 'lucide-react'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from "@/components/ui/label"
import { useTargetStore } from '@/store/targetStore'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProjects, createProject, pickProjectFolder, type UserProject } from '@/lib/api'
import { toast } from 'sonner'

export function SyncTargetSelector() {
    const store = useTargetStore()
    const queryClient = useQueryClient()
    const [isAddProjectOpen, setIsAddProjectOpen] = useState(false)
    const [newProjectPath, setNewProjectPath] = useState('')
    const [newProjectName, setNewProjectName] = useState('')

    // Fetch persistent projects (UserProject[]) instead of recent/scanned
    const { data: projects = [] } = useQuery<UserProject[]>({
        queryKey: ['projects'],
        queryFn: fetchProjects,
        // Default staleTime is 0, so it fetches on mount/focus, which is fine for a light JSON read.
        // No explicit "scan" here.
    })

    const createMutation = useMutation({
        mutationFn: createProject,
        onSuccess: (newProject) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] })
            store.setTarget('project', newProject.path, newProject.name)
            setIsAddProjectOpen(false)
            setNewProjectPath('')
            setNewProjectName('')
            toast.success(`Project "${newProject.name}" added`)
        },
        onError: () => toast.error('Failed to create project')
    })

    const handleBrowse = async () => {
        try {
            const result = await pickProjectFolder()
            if (result.path) {
                setNewProjectPath(result.path)
                // Auto-suggest name
                const name = result.path.replace(/[/\\]$/, '').split(/[/\\]/).pop() || 'My Project'
                setNewProjectName(name)
            }
        } catch (error) {
            toast.error('Failed to open folder picker')
            console.error(error)
        }
    }

    const handleAddProject = () => {
        if (!newProjectPath.trim()) return

        const path = newProjectPath.trim()
        const name = newProjectName.trim() || path.replace(/[/\\]$/, '').split(/[/\\]/).pop() || 'Unknown Project'

        createMutation.mutate({ path, name, source: 'manual' as const })
    }

    const currentSelectValue = store.mode === 'global' ? 'global' : store.projectPath || ''

    // Combined list: Global + Projects
    // Note: store.customProjects is ignored now in favor of backend projects

    return (
        <>
            <Select
                value={currentSelectValue}
                onValueChange={(val) => {
                    if (val === 'global') {
                        store.setTarget('global');
                    } else if (val === 'add_project') {
                        setIsAddProjectOpen(true);
                    } else {
                        const project = projects.find(p => p.path === val)
                        // Fallback to finding by path if name missing, usually shouldn't happen if list is up to date
                        const name = project ? project.name : val.split('/').pop() || 'Project'
                        store.setTarget('project', val, name);
                    }
                }}
            >
                <SelectTrigger className="w-[180px] h-9">
                    {store.mode === 'global' ? (
                        <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                            <span className="text-sm">Global</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 truncate">
                            <LayoutGrid className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate text-sm" title={store.projectName || 'Project'}>{store.projectName || 'Project'}</span>
                        </div>
                    )}
                </SelectTrigger>
                <SelectContent>
                    <SelectGroup>
                        <SelectLabel>Target</SelectLabel>
                        <SelectItem value="global">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-secondary" />
                                <span>Global</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="add_project">
                            <div className="flex items-center gap-2 font-medium text-primary">
                                <FolderOpen className="w-4 h-4" />
                                <span>Add Project</span>
                            </div>
                        </SelectItem>
                    </SelectGroup>

                    {projects.length > 0 && (
                        <>
                            <SelectSeparator />
                            <SelectGroup>
                                <SelectLabel>Projects</SelectLabel>
                                {projects.map(p => (
                                    <SelectItem key={p.id} value={p.path}>
                                        <div className="flex items-center gap-2">
                                            <LayoutGrid className="w-4 h-4 text-muted-foreground" />
                                            <span>{p.name}</span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectGroup>
                        </>
                    )}
                </SelectContent>
            </Select>

            <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
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
                                    value={newProjectPath}
                                    onChange={(e) => setNewProjectPath(e.target.value)}
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
                                value={newProjectName}
                                onChange={(e) => setNewProjectName(e.target.value)}
                                placeholder="My Awesome Project"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setIsAddProjectOpen(false)}>Cancel</Button>
                        <Button type="submit" onClick={handleAddProject} disabled={!newProjectPath || createMutation.isPending}>
                            {createMutation.isPending ? 'Adding...' : 'Add Project'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
