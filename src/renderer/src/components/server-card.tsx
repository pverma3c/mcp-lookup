import { Link } from 'react-router-dom'
import {
  Hammer,
  Loader2,
  MessageSquareText,
  MoreVertical,
  PlugZap,
  Power,
  SquareLibrary,
  TriangleAlert,
  Trash2,
  Pencil,
  X
} from 'lucide-react'
import { McpLogo } from '@/components/mcp-logo'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import type { ServerStatus, ServerView } from '@/lib/mcp-types'

interface Props {
  server: ServerView
  onEdit: () => void
}

const STATUS_LABEL: Record<ServerStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Error'
}

const STATUS_DOT: Record<ServerStatus, string> = {
  disconnected: 'bg-muted-foreground/40',
  connecting: 'bg-amber-500',
  connected: 'bg-emerald-500',
  error: 'bg-destructive'
}

function transportLabel(server: ServerView): string {
  switch (server.config.transport) {
    case 'stdio':
      return 'Stdio'
    case 'http':
      return 'HTTP'
    case 'sse':
      return 'SSE'
  }
}

function transportSummary(server: ServerView): string {
  if (server.config.transport === 'stdio') {
    const argsPart = server.config.args.length > 0 ? ` ${server.config.args.join(' ')}` : ''
    return `${server.config.command}${argsPart}`
  }
  return server.config.url
}

export function ServerCard({ server, onEdit }: Props): React.JSX.Element {
  const { runtime } = server
  const status = runtime.status

  const handleConnect = async (e: React.MouseEvent): Promise<void> => {
    e.preventDefault()
    e.stopPropagation()
    if (status === 'connecting') {
      await window.api.mcp.cancelConnect(server.id)
    } else if (status === 'connected') {
      await window.api.mcp.disconnect(server.id)
      toast.success(`Disconnected ${server.name}`)
    } else {
      await window.api.mcp.connect(server.id)
    }
  }

  const handleDelete = async (): Promise<void> => {
    if (!confirm(`Delete "${server.name}"?`)) return
    await window.api.mcp.remove(server.id)
    toast.success('Server deleted')
  }

  const isConnecting = status === 'connecting'

  return (
    <Link
      to={`/servers/${server.id}`}
      className="block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="h-full gap-4 py-5 transition-colors hover:border-foreground/20">
        <CardHeader>
          <CardTitle className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
              <McpLogo className="size-4" />
            </span>
            <span className="truncate">{server.name}</span>
          </CardTitle>
          <CardDescription className="truncate pl-12 font-mono text-xs">
            {transportSummary(server)}
          </CardDescription>
          <CardAction>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                  }}
                  aria-label="More"
                >
                  <MoreVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
              >
                <DropdownMenuItem
                  onSelect={() => {
                    if (status === 'connecting') void window.api.mcp.cancelConnect(server.id)
                    else if (status === 'connected') void window.api.mcp.disconnect(server.id)
                    else void window.api.mcp.connect(server.id)
                  }}
                >
                  {status === 'connecting' ? (
                    <>
                      <X /> Cancel
                    </>
                  ) : status === 'connected' ? (
                    <>
                      <Power /> Disconnect
                    </>
                  ) : (
                    <>
                      <PlugZap /> Connect
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onEdit} disabled={isConnecting}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onSelect={handleDelete}
                  disabled={isConnecting}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardAction>
        </CardHeader>

        <CardContent className="flex flex-wrap items-center gap-1.5">
          <Badge variant="outline">{transportLabel(server)}</Badge>
          {runtime.capabilities.tools && (
            <Badge variant="secondary" className="gap-1">
              <Hammer className="size-3" />
              {runtime.tools.length} tools
            </Badge>
          )}
          {runtime.capabilities.prompts && (
            <Badge variant="secondary" className="gap-1">
              <MessageSquareText className="size-3" />
              {runtime.prompts.length} prompts
            </Badge>
          )}
          {runtime.capabilities.resources && (
            <Badge variant="secondary" className="gap-1">
              <SquareLibrary className="size-3" />
              {runtime.resources.length} resources
            </Badge>
          )}
          {status === 'error' && runtime.error && (
            <Badge variant="destructive" className="gap-1">
              <TriangleAlert className="size-3" />
              Error
            </Badge>
          )}
        </CardContent>

        <CardFooter className="justify-between border-t pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className={cn('size-2 rounded-full', STATUS_DOT[status])} aria-hidden />
            <span>{STATUS_LABEL[status]}</span>
          </div>
          <Button
            variant={
              status === 'connecting'
                ? 'destructive'
                : status === 'connected'
                  ? 'outline'
                  : 'default'
            }
            size="sm"
            onClick={handleConnect}
          >
            {status === 'connecting' ? (
              <>
                <Loader2 className="animate-spin" /> Cancel
              </>
            ) : status === 'connected' ? (
              <>
                <Power /> Disconnect
              </>
            ) : (
              <>
                <PlugZap /> Connect
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </Link>
  )
}
