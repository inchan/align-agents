
import { GitBranch, Folder, Database, Search, MessageSquare, Globe, Server } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { McpDef } from '@/lib/api'

export function getMcpIcon(name: string, command: string) {
    const lowerName = name.toLowerCase()
    const lowerCmd = command.toLowerCase()

    if (lowerName.includes('github') || lowerName.includes('git') || lowerCmd.includes('git')) return <GitBranch className="w-4 h-4" />
    if (lowerName.includes('file') || lowerName.includes('fs') || lowerCmd.includes('fs')) return <Folder className="w-4 h-4" />
    if (lowerName.includes('postgres') || lowerName.includes('sql') || lowerName.includes('db') || lowerName.includes('database')) return <Database className="w-4 h-4" />
    if (lowerName.includes('search') || lowerName.includes('brave') || lowerName.includes('google')) return <Search className="w-4 h-4" />
    if (lowerName.includes('slack') || lowerName.includes('discord') || lowerName.includes('chat')) return <MessageSquare className="w-4 h-4" />
    if (lowerName.includes('web') || lowerName.includes('http') || lowerName.includes('fetch')) return <Globe className="w-4 h-4" />

    return <Server className="w-4 h-4" />
}

export function McpIcon({ def, className }: { def: McpDef, className?: string }) {
    const { name, command, args } = def

    // 1. Try to find GitHub URL in args to get the owner's avatar
    let githubOwner = ''
    if (args) {
        for (const arg of args) {
            // Match github.com/OWNER or ghcr.io/OWNER
            const match = arg.match(/(?:github\.com|ghcr\.io)[/:]([^/]+)/)
            if (match && match[1]) {
                githubOwner = match[1]
                break
            }
        }
    }

    const icon = getMcpIcon(name, command)

    if (!githubOwner) {
        return icon
    }

    // Pass styling to Avatar
    return (
        <Avatar className={cn("w-full h-full rounded-md", className)}>
            <AvatarImage
                src={`https://github.com/${githubOwner}.png`}
                alt={name}
                className="object-cover"
            />
            <AvatarFallback className="bg-transparent rounded-none flex items-center justify-center w-full h-full">
                {icon}
            </AvatarFallback>
        </Avatar>
    )
}
