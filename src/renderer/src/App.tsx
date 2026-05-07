import { Route, Routes } from 'react-router-dom'
import { AppBreadcrumb } from '@/components/app-breadcrumb'
import { AppHeaderActions } from '@/components/app-header-actions'
import { AppSidebar } from '@/components/app-sidebar'
import { TitleBar } from '@/components/title-bar'
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { Toaster } from '@/components/ui/sonner'
import Chat from '@/pages/Chat'
import Dashboard from '@/pages/Dashboard'
import Providers from '@/pages/Providers'
import ServerDetail from '@/pages/ServerDetail'

function App(): React.JSX.Element {
  return (
    <div className="flex h-screen flex-col">
      <TitleBar />
      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <SidebarProvider className="min-h-0 min-w-0 flex-1">
          <AppSidebar />
          <SidebarInset className="min-w-0 overflow-hidden">
            <header className="flex h-14 shrink-0 items-center gap-3 border-b px-4">
              <SidebarTrigger />
              <AppBreadcrumb />
              <div className="ml-auto">
                <AppHeaderActions />
              </div>
            </header>
            <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/chat" element={<Chat />} />
                <Route path="/providers" element={<Providers />} />
                <Route path="/servers/:id" element={<ServerDetail />} />
              </Routes>
            </main>
            <Toaster richColors />
          </SidebarInset>
        </SidebarProvider>
      </div>
    </div>
  )
}

export default App
