import { Outlet } from 'react-router-dom'
import { Sidebar } from '../components/dashboard/Sidebar'
import { Header } from '../components/dashboard/Header'
import { ApiStatusBanner } from '../components/ApiStatusBanner'

export function DashboardLayout() {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex h-screen overflow-hidden grid-pattern">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col border-r bg-card">
          <Sidebar />
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="h-14 border-b bg-card px-6 flex items-center">
            <Header />
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6">
            <Outlet />
          </main>
        </div>
      </div>

      <ApiStatusBanner />
    </div>
  )
}
