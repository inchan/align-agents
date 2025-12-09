import { useState } from 'react'
import { Button } from './ui/button'
import { type ToolConfig } from '../lib/api'
import { RefreshCw, ChevronDown } from 'lucide-react'
import { useTargetStore } from '@/store/targetStore'
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface SyncControlsProps {
    tools: ToolConfig[]
    onSync: (toolIds: string[] | null, strategy?: string) => void
    isSyncing: boolean
}

export function SyncControls({ tools, onSync, isSyncing }: SyncControlsProps) {
    const [selectedToolIds, setSelectedToolIds] = useState<string[]>([])
    const { strategy } = useTargetStore()

    // 설치된 도구만 필터링
    const installedTools = tools.filter(t => t.exists)
    const isAllSelected = selectedToolIds.length === 0

    const handleToolToggle = (toolId: string) => {
        if (selectedToolIds.includes(toolId)) {
            setSelectedToolIds(prev => prev.filter(id => id !== toolId))
        } else {
            setSelectedToolIds(prev => [...prev, toolId])
        }
    }

    const handleSyncClick = () => {
        if (isAllSelected) {
            onSync(null, strategy)
        } else {
            if (selectedToolIds.length === 0) {
                return
            }
            onSync(selectedToolIds, strategy)
        }
    }

    return (
        <div className="flex items-center gap-3">
            {/* Tools Selector - DropdownMenu */}
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9 gap-2"
                    >
                        {isAllSelected ? (
                            <>All Tools ({installedTools.length})</>
                        ) : (
                            <>{selectedToolIds.length} Selected</>
                        )}
                        <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Select Tools</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuCheckboxItem
                        checked={isAllSelected}
                        onCheckedChange={(checked) => {
                            if (checked) setSelectedToolIds([])
                        }}
                    >
                        All Tools
                    </DropdownMenuCheckboxItem>
                    <DropdownMenuSeparator />
                    {installedTools.map(tool => (
                        <DropdownMenuCheckboxItem
                            key={tool.id}
                            checked={selectedToolIds.includes(tool.id)}
                            onCheckedChange={() => handleToolToggle(tool.id)}
                        >
                            {tool.name}
                        </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Sync Button */}
            <Button
                onClick={handleSyncClick}
                disabled={isSyncing || (!isAllSelected && selectedToolIds.length === 0)}
                size="sm"
                className="h-9 gap-2 shadow-sm"
            >
                {isSyncing ? (
                    <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Syncing...
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-4 h-4" />
                        Sync Now
                    </>
                )}
            </Button>
        </div>
    )
}
