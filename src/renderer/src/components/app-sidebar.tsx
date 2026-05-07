import { Bot, LayoutDashboard, MessagesSquare } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { McpBrandLogo } from '@/components/mcp-brand-logo'
import { ModeToggle } from '@/components/mode-toggle'
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
  { title: 'Chat', to: '/chat', icon: MessagesSquare },
  { title: 'Providers', to: '/providers', icon: Bot }
]

export function AppSidebar(): React.JSX.Element {
  const { pathname } = useLocation()

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <McpBrandLogo className="size-10 shrink-0" />
          <div className="flex min-w-0 flex-col leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate text-sm font-semibold">mcp-lookup</span>
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
        <div className="flex items-center justify-between gap-2 px-1 py-1">
          <span className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
            Theme
          </span>
          <ModeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
