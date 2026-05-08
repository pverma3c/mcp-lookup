import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { Loader2, Pencil, Play, PlugZap, Power, X } from 'lucide-react'
import { toast } from 'sonner'
import { AddServerDialog } from '@/components/add-server-dialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { useServers } from '@/hooks/use-servers'
import { usePlaygroundActions } from '@/lib/playground-actions'

export function AppHeaderActions(): React.JSX.Element | null {
  const serverMatch = useMatch('/servers/:id')
  const playgroundMatch = useMatch('/playground')
  const playground = usePlaygroundActions()
  const { servers } = useServers()
  const [editing, setEditing] = useState(false)

  if (playgroundMatch) {
    return (
      <Button
        size="sm"
        onClick={() => playground.run?.()}
        disabled={!playground.canRun || playground.running || !playground.run}
      >
        {playground.running ? (
          <>
            <Loader2 className="animate-spin" /> Running…
          </>
        ) : (
          <>
            <Play /> Run
          </>
        )}
      </Button>
    )
  }

  if (!serverMatch) return null
  const server = servers.find((s) => s.id === serverMatch.params.id)
  if (!server) return null

  const status = server.runtime.status

  const handleConnect = async (): Promise<void> => {
    if (status === 'connecting') {
      await window.api.mcp.cancelConnect(server.id)
    } else if (status === 'connected') {
      await window.api.mcp.disconnect(server.id)
      toast.success(`Disconnected ${server.name}`)
    } else {
      await window.api.mcp.connect(server.id)
    }
  }

  const isConnecting = status === 'connecting'

  return (
    <>
      <ButtonGroup>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
          disabled={isConnecting}
          title={isConnecting ? 'Cancel the connection first to edit' : undefined}
        >
          <Pencil />
          Edit
        </Button>
        <ButtonGroupSeparator />
        {isConnecting ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConnect}
            title="Cancel connection"
          >
            <Loader2 className="animate-spin" /> Cancel
            <X className="size-3.5" />
          </Button>
        ) : status === 'connected' ? (
          <Button
            variant="destructive"
            size="icon-sm"
            onClick={handleConnect}
            aria-label="Disconnect"
            title="Disconnect"
          >
            <Power />
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={handleConnect}>
            <PlugZap /> Connect
          </Button>
        )}
      </ButtonGroup>
      <AddServerDialog open={editing} onOpenChange={setEditing} editing={server} />
    </>
  )
}
