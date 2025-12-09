import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchConfig, saveConfig } from '@/lib/api'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import Editor from '@monaco-editor/react'
import { RefreshCw, Save, AlertCircle } from 'lucide-react'

interface ConfigEditorProps {
    isOpen: boolean
    onClose: () => void
    configPath: string | null
    toolName: string | null
}

export function ConfigEditor({ isOpen, onClose, configPath, toolName }: ConfigEditorProps) {
    const [content, setContent] = useState('')
    const queryClient = useQueryClient()

    const { data, isLoading, error } = useQuery({
        queryKey: ['config', configPath],
        queryFn: () => fetchConfig(configPath!),
        enabled: !!configPath && isOpen,
    })

    // React Query v5 - onSuccess removed, use useEffect instead
    useEffect(() => {
        if (data) {
            setContent(data.content)
        }
    }, [data])

    const mutation = useMutation({
        mutationFn: async () => {
            if (!configPath) return
            await saveConfig(configPath, content)
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['config', configPath] })
            onClose()
        },
    })

    return (
        <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <SheetContent side="right" className="w-[800px] sm:max-w-[800px] flex flex-col h-full">
                <SheetHeader>
                    <SheetTitle>Edit Configuration</SheetTitle>
                    <SheetDescription>
                        Editing {toolName} config at {configPath}
                    </SheetDescription>
                </SheetHeader>

                <div className="flex-1 py-4 flex flex-col gap-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center h-full text-destructive gap-2">
                            <AlertCircle className="h-8 w-8" />
                            <p>Failed to load configuration</p>
                        </div>
                    ) : (
                        <div className="border rounded-md overflow-hidden h-full">
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                theme="vs-dark"
                                value={content}
                                onChange={(value: string | undefined) => setContent(value || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 13,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                }}
                            />
                        </div>
                    )}
                </div>

                <SheetFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => mutation.mutate()}
                        disabled={isLoading || mutation.isPending}
                        className="gap-2"
                    >
                        {mutation.isPending && <RefreshCw className="h-4 w-4 animate-spin" />}
                        <Save className="h-4 w-4" />
                        Save Changes
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
