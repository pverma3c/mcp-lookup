import { useEffect, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  Download,
  ExternalLink,
  Loader2,
  RefreshCw,
  RotateCw
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useUpdate } from '@/hooks/use-update'

function formatBytes(n: number): string {
  if (!n) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)))
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`
}

export function UpdateIndicator(): React.JSX.Element | null {
  const { state, check, download, install, openRelease } = useUpdate()
  const [open, setOpen] = useState(false)
  const [hideNotAvailable, setHideNotAvailable] = useState(false)

  useEffect(() => {
    if (state.status !== 'not-available') return
    setHideNotAvailable(false)
    const t = window.setTimeout(() => setHideNotAvailable(true), 2500)
    return () => window.clearTimeout(t)
  }, [state.status])

  const visible =
    state.status === 'available' ||
    state.status === 'downloading' ||
    state.status === 'downloaded' ||
    state.status === 'error' ||
    state.status === 'checking' ||
    (state.status === 'not-available' && !hideNotAvailable) ||
    open

  if (!visible) {
    return (
      <button
        type="button"
        onClick={() => void check()}
        aria-label="Check for updates"
        title="Check for updates"
        className="flex h-5 cursor-pointer items-center gap-1 rounded px-1.5 text-[10px] text-muted-foreground/60 transition-colors hover:bg-muted/40 hover:text-foreground"
      >
        <RefreshCw className="size-2.5" />
      </button>
    )
  }

  const dotColor =
    state.status === 'available' || state.status === 'downloaded'
      ? 'bg-amber-500'
      : state.status === 'error'
        ? 'bg-red-500'
        : state.status === 'not-available'
          ? 'bg-emerald-500'
          : 'bg-muted-foreground'

  const label =
    state.status === 'available'
      ? `Update available · ${state.version}`
      : state.status === 'downloading'
        ? `Downloading ${Math.round(state.percent)}%`
        : state.status === 'downloaded'
          ? `Ready to install · ${state.version}`
          : state.status === 'checking'
            ? 'Checking…'
            : state.status === 'error'
              ? 'Update error'
              : state.status === 'not-available'
                ? 'Up to date'
                : ''

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={label}
          title={label}
          className={cn(
            'flex h-5 cursor-pointer items-center gap-1.5 rounded px-1.5 text-[10px] font-medium transition-colors',
            'hover:bg-muted/40',
            state.status === 'available' || state.status === 'downloaded'
              ? 'text-amber-500'
              : state.status === 'error'
                ? 'text-red-500'
                : 'text-muted-foreground'
          )}
        >
          {state.status === 'checking' || state.status === 'downloading' ? (
            <Loader2 className="size-2.5 animate-spin" />
          ) : state.status === 'available' ? (
            <ArrowDownToLine className="size-2.5" />
          ) : state.status === 'downloaded' ? (
            <RotateCw className="size-2.5" />
          ) : state.status === 'error' ? (
            <AlertCircle className="size-2.5" />
          ) : state.status === 'not-available' ? (
            <Check className="size-2.5" />
          ) : (
            <span
              className={cn(
                'size-1.5 rounded-full shadow-[0_0_6px_currentColor]',
                dotColor
              )}
            />
          )}
          <span className="max-w-[160px] truncate">{label}</span>
          {state.status === 'downloading' && (
            <span className="ml-1 h-1 w-12 overflow-hidden rounded-full bg-muted/60">
              <span
                className="block h-full rounded-full bg-amber-500 transition-[width]"
                style={{ width: `${Math.max(2, Math.round(state.percent))}%` }}
              />
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[320px] rounded-2xl p-0"
      >
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">
                {state.status === 'available' && 'Update available'}
                {state.status === 'downloading' && 'Downloading update'}
                {state.status === 'downloaded' && 'Update ready to install'}
                {state.status === 'checking' && 'Checking for updates'}
                {state.status === 'not-available' && 'You’re on the latest version'}
                {state.status === 'error' && 'Update failed'}
                {state.status === 'idle' && 'No update info yet'}
              </span>
              <span className="font-mono text-[10px] text-muted-foreground">
                Current v{state.current || '?'}
                {(state.status === 'available' ||
                  state.status === 'downloading' ||
                  state.status === 'downloaded') &&
                  ` → v${state.version}`}
              </span>
            </div>
          </div>

          {state.status === 'available' && state.releaseNotes && (
            <pre className="schema-scroll max-h-40 overflow-y-auto rounded-lg border bg-muted/30 p-2 text-[11px] leading-relaxed whitespace-pre-wrap text-foreground/90">
              {state.releaseNotes}
            </pre>
          )}

          {state.status === 'downloading' && (
            <div className="flex flex-col gap-1.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-amber-500 transition-[width]"
                  style={{ width: `${Math.max(2, Math.round(state.percent))}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] tabular-nums text-muted-foreground">
                <span>
                  {formatBytes(state.transferred)} / {formatBytes(state.total)}
                </span>
                <span>{formatBytes(state.bytesPerSecond)}/s</span>
              </div>
            </div>
          )}

          {state.status === 'downloaded' && !state.canInstall && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-[11px] text-amber-500/90">
              Auto-install isn't supported for this build (likely a .deb or
              non-AppImage Linux package). Open the release page to download
              the new version manually.
            </p>
          )}

          {state.status === 'error' && (
            <pre className="schema-scroll max-h-32 overflow-y-auto rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-[11px] whitespace-pre-wrap text-red-400">
              {state.message}
            </pre>
          )}

          <div className="flex items-center gap-1.5">
            {state.status === 'available' && (
              <Button
                size="sm"
                className="h-8 flex-1 gap-1.5 rounded-full"
                onClick={() => void download()}
              >
                <Download className="size-3.5" /> Download
              </Button>
            )}
            {state.status === 'downloaded' && state.canInstall && (
              <Button
                size="sm"
                className="h-8 flex-1 gap-1.5 rounded-full"
                onClick={() => void install()}
              >
                <RotateCw className="size-3.5" /> Restart & install
              </Button>
            )}
            {(state.status === 'downloaded' ||
              state.status === 'error' ||
              state.status === 'available') && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 rounded-full"
                onClick={() => void openRelease()}
              >
                <ExternalLink className="size-3.5" /> Release page
              </Button>
            )}
            {(state.status === 'idle' ||
              state.status === 'not-available' ||
              state.status === 'error') && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 flex-1 gap-1.5 rounded-full"
                onClick={() => void check()}
              >
                <RefreshCw className="size-3.5" /> Check again
              </Button>
            )}
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
