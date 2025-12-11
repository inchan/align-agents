import { Moon, Sun, Menu, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLocation } from 'react-router-dom'
import { useTheme } from '@/components/theme-provider'
import { SyncStrategySelector } from './SyncStrategySelector'
import { SyncTargetSelector } from './SyncTargetSelector'
import { useGlobalSync } from '@/hooks/useGlobalSync'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const location = useLocation()
  const { theme, setTheme } = useTheme()
  const { sync: handleSync, isPending: isSyncPending, canSync } = useGlobalSync()

  const getPageTitle = (pathname: string) => {
    switch (pathname) {
      case '/':
        return 'Dashboard'
      case '/tools':
        return 'Tools'
      case '/rules':
        return 'Rules'
      case '/sync':
        return 'Sync'
      case '/mcp':
        return 'MCP'
      case '/logs':
        return 'Logs'
      case '/settings':
        return 'Settings'
      default:
        if (pathname.startsWith('/sync/')) {
          return 'Sync Details'
        }
        return 'Dashboard'
    }
  }

  return (
    <div className="flex items-center justify-between w-full">
      <div className="flex items-center gap-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={onMenuClick}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>메뉴 열기</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <h1 className="text-lg font-semibold">{getPageTitle(location.pathname)}</h1>
      </div>

      <div className="flex items-center gap-2">
        <SyncTargetSelector />
        <SyncStrategySelector />
        <Button
          size="sm"
          onClick={() => {
            console.log('[Header] Sync button clicked:', {
              pathname: location.pathname,
              canSync,
              isSyncPending
            })
            if (location.pathname === '/rules') {
              handleSync({ scope: 'rules', forceAllTools: true })
            } else if (location.pathname === '/mcp') {
              handleSync({ scope: 'mcp', forceAllTools: true })
            } else {
              handleSync()
            }
          }}
          disabled={!canSync}
          className={cn("mr-2", isSyncPending && "opacity-80")}
        >
          {isSyncPending ? (
            <Spinner className="mr-2 h-4 w-4 text-primary-foreground" />
          ) : (
            <RefreshCw className={cn("mr-2 h-4 w-4", isSyncPending && "animate-spin")} />
          )}
          Sync
        </Button>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>테마 변경</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  )
}
