import { useState } from 'react'
import { Beaker, Bot, LayoutDashboard, MessagesSquare } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { AboutDialog } from '@/components/about-dialog'
import { McpBrandLogo } from '@/components/mcp-brand-logo'
import { ModeToggle } from '@/components/mode-toggle'
import { useUpdate } from '@/hooks/use-update'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'

const items = [
  { title: 'Dashboard', to: '/', icon: LayoutDashboard },
  { title: 'Playground', to: '/playground', icon: Beaker },
  { title: 'Chat', to: '/chat', icon: MessagesSquare },
  { title: 'Providers', to: '/providers', icon: Bot }
]

export function AppSidebar(): React.JSX.Element {
  const { pathname } = useLocation()
  const { state: updateState } = useUpdate()
  const version = updateState.current
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <McpBrandLogo className="size-10 shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">MCP-Lookup</span>
            <span className="truncate text-[10px] text-muted-foreground">
              MCP server playground
            </span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.to}>
                    <NavLink to={item.to} end>
                      <item.icon />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t">
        <button
          type="button"
          onClick={() => setAboutOpen(true)}
          className="cursor-pointer px-2 py-1 text-left font-mono text-[10px] text-muted-foreground/70 transition-colors hover:text-foreground group-data-[collapsible=icon]:hidden"
          title="About MCP-Lookup"
        >
          v{version || '?'}
        </button>
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Theme
          </span>
          <ModeToggle />
        </div>
      </SidebarFooter>
      <AboutDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </Sidebar>
  )
}
