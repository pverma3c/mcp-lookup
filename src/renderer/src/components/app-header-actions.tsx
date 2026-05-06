import { useState } from 'react'
import { useMatch } from 'react-router-dom'
import { Loader2, Pencil, PlugZap, Power } from 'lucide-react'
import { toast } from 'sonner'
import { AddServerDialog } from '@/components/add-server-dialog'
import { Button } from '@/components/ui/button'
import { ButtonGroup, ButtonGroupSeparator } from '@/components/ui/button-group'
import { useServers } from '@/hooks/use-servers'

export function AppHeaderActions(): React.JSX.Element | null {
  const serverMatch = useMatch('/servers/:id')
  const { servers } = useServers()
  const [editing, setEditing] = useState(false)

  if (!serverMatch) return null
  const server = servers.find((s) => s.id === serverMatch.params.id)
  if (!server) return null

  const status = server.runtime.status

  const handleConnect = async (): Promise<void> => {
    if (status === 'connected') {
      await window.api.mcp.disconnect(server.id)
      toast.success(`Disconnected ${server.name}`)
    } else {
      await window.api.mcp.connect(server.id)
    }
  }

  return (
    <>
      <ButtonGroup>
        <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
          <Pencil />
          Edit
        </Button>
        <ButtonGroupSeparator />
        {status === 'connected' ? (
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
          <Button
            variant="outline"
            size="sm"
            onClick={handleConnect}
            disabled={status === 'connecting'}
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="animate-spin" /> Connecting
              </>
            ) : (
              <>
                <PlugZap /> Connect
              </>
            )}
          </Button>
        )}
      </ButtonGroup>
      <AddServerDialog open={editing} onOpenChange={setEditing} editing={server} />
    </>
  )
}
