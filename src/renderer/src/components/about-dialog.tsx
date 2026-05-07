import { ExternalLink, RefreshCw } from 'lucide-react'
import { McpBrandLogo } from '@/components/mcp-brand-logo'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { useUpdate } from '@/hooks/use-update'

const REPO_URL = 'https://github.com/pverma3c/mcp-lookup'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: Props): React.JSX.Element {
  const { state, check } = useUpdate()
  const version = state.current
  const releaseUrl = version ? `${REPO_URL}/releases/tag/v${version}` : `${REPO_URL}/releases`

  const checkLabel =
    state.status === 'checking'
      ? 'Checking…'
      : state.status === 'available'
        ? `Update available: v${state.version}`
        : state.status === 'downloading'
          ? `Downloading v${state.version}…`
          : state.status === 'downloaded'
            ? `Ready to install v${state.version}`
            : state.status === 'not-available'
              ? 'You’re on the latest version'
              : state.status === 'error'
                ? 'Update check failed'
                : 'Check for updates'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader className="items-center gap-3 text-center">
          <McpBrandLogo className="size-14" />
          <DialogTitle className="text-xl">MCP-Lookup</DialogTitle>
          <DialogDescription>
            Desktop playground for discovering, connecting to, and chatting against
            MCP (Model Context Protocol) servers.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-1 pt-1">
          <span className="font-mono text-sm font-medium">v{version || '?'}</span>
          {state.status === 'available' && (
            <span className="text-xs text-amber-500">
              v{state.version} is available — see the title bar to install.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2 rounded-xl border bg-muted/30 p-3 text-xs">
          <Row label="Repository" href={REPO_URL} display="github.com/pverma3c/mcp-lookup" />
          <Row label="This release" href={releaseUrl} display={`v${version || '?'}`} />
          <Row label="All releases" href={`${REPO_URL}/releases`} display="GitHub Releases" />
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void check()}
            disabled={state.status === 'checking' || state.status === 'downloading'}
          >
            <RefreshCw /> {checkLabel}
          </Button>
          <Button
            asChild
            size="sm"
            variant="default"
          >
            <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
              <ExternalLink /> Open on GitHub
            </a>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Row({
  label,
  href,
  display
}: {
  label: string
  href: string
  display: string
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="inline-flex items-center gap-1 truncate font-mono text-foreground transition-colors hover:text-foreground/80"
      >
        <span className="truncate">{display}</span>
        <ExternalLink className="size-3 shrink-0 opacity-60" />
      </a>
    </div>
  )
}
