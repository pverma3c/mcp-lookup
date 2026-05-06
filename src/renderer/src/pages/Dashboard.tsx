import { useState } from 'react'
import { Plus, ServerCog } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { AddServerDialog } from '@/components/add-server-dialog'
import { ServerCard } from '@/components/server-card'
import { useServers } from '@/hooks/use-servers'
import type { ServerView } from '@/lib/mcp-types'

function Dashboard(): React.JSX.Element {
  const { servers } = useServers()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<ServerView | undefined>()

  const openAdd = (): void => {
    setEditing(undefined)
    setDialogOpen(true)
  }
  const openEdit = (server: ServerView): void => {
    setEditing(server)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">MCP Servers</h1>
          <p className="text-sm text-muted-foreground">
            Add servers and inspect the tools, prompts, and resources they expose.
          </p>
        </div>
        {servers.length > 0 && (
          <Button onClick={openAdd}>
            <Plus /> Add server
          </Button>
        )}
      </header>

      {servers.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ServerCog />
            </EmptyMedia>
            <EmptyTitle>No MCP servers yet</EmptyTitle>
            <EmptyDescription>
              Add your first server — stdio for local processes, HTTP or SSE for remote endpoints.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={openAdd}>
              <Plus /> Add server
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {servers.map((server) => (
            <ServerCard key={server.id} server={server} onEdit={() => openEdit(server)} />
          ))}
        </div>
      )}

      <AddServerDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
    </div>
  )
}

export default Dashboard
