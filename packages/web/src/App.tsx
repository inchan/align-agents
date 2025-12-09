import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom'
import { DashboardLayout } from './layouts/DashboardLayout'
import { ThemeProvider } from './components/theme-provider'
import { DashboardPage } from './pages/DashboardPage'
import { RulesPage } from './pages/RulesPage'
import { LogsPage } from './pages/LogsPage'
import { McpPage } from './pages/McpPage'
import { SyncDetailPage } from './pages/SyncDetailPage'
import { SyncPage } from './pages/SyncPage'
import { ProjectsPage } from './pages/ProjectsPage'

import { RuleLibraryPage } from './pages/RuleLibraryPage'
import { Toaster } from 'sonner'

const router = createBrowserRouter([
  {
    path: '/',
    element: <DashboardLayout />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'projects',
        element: <ProjectsPage />,
      },
      {
        path: 'rules',
        element: <RulesPage />,
      },
      {
        path: 'sync',
        element: <SyncPage />,
      },
      {
        path: 'sync/:syncId',
        element: <SyncDetailPage />,
      },
      {
        path: 'logs',
        element: <LogsPage />,
      },
      {
        path: 'mcp',
        element: <McpPage />,
      },

      {
        path: 'library/rules',
        element: <RuleLibraryPage />,
      },
      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
])

export default function App() {
  return (
    <>
      <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
        <RouterProvider router={router} />
        <Toaster
          position="bottom-right"
          richColors
          theme="dark"
          expand={true}
        />
      </ThemeProvider>
    </>
  )
}
