import { Link, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  FileText,
  Settings,
  Server,
  RefreshCw,
  ScrollText,
  Box,
  Briefcase
} from 'lucide-react'

const mainNavItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/' },
  { icon: RefreshCw, label: 'Sync', href: '/sync' },
  { icon: FileText, label: 'Rules', href: '/rules' },
  { icon: Server, label: 'MCP', href: '/mcp' },
  { icon: Briefcase, label: 'Projects', href: '/projects' },
]

const bottomNavItems = [
  { icon: ScrollText, label: 'Logs', href: '/logs' },
  { icon: Settings, label: 'Settings', href: '/settings' }
]

export function Sidebar() {
  const { pathname } = useLocation()

  const renderNavItem = (item: { icon: typeof LayoutDashboard; label: string; href: string }) => {
    const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
    const Icon = item.icon

    return (
      <Link
        key={item.href}
        to={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </Link>
    )
  }

  return (
    <div className="flex flex-col h-full bg-muted/10 border-r">
      {/* Logo */}
      <div className="p-6 border-b bg-background">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Box className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-lg">align-agents</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {mainNavItems.map(renderNavItem)}
      </nav>

      {/* Bottom Navigation */}
      <div className="p-4 border-t bg-background space-y-1">
        {bottomNavItems.map(renderNavItem)}
      </div>
    </div>
  )
}
