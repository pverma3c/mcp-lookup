import { useEffect, useState } from 'react'
import { Maximize2, Minus, ScrollText, X } from 'lucide-react'
import { LogSheet } from '@/components/log-sheet'
import { cn } from '@/lib/utils'
import { UpdateIndicator } from '@/components/update-indicator'

export function TitleBar(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [logCount, setLogCount] = useState(0)
  const [pulsing, setPulsing] = useState(false)
  const hasLogs = logCount > 0

  useEffect(() => {
    void window.api.win.isMaximized().then(setMaximized)
    return window.api.win.onMaximizedChange(setMaximized)
  }, [])

  useEffect(() => {
    let active = true
    void window.api.mcp.getAllLogs().then((lines) => {
      if (active) setLogCount(lines.length)
    })
    const off = window.api.mcp.onServerLog(() => {
      setLogCount((n) => n + 1)
      setPulsing(true)
      window.setTimeout(() => setPulsing(false), 1200)
    })
    const onCleared = (): void => setLogCount(0)
    window.addEventListener('mcp:logs-cleared', onCleared)
    return () => {
      active = false
      off()
      window.removeEventListener('mcp:logs-cleared', onCleared)
    }
  }, [])

  return (
    <>
      <div
        className="relative z-50 flex h-7 shrink-0 items-stretch border-b bg-sidebar text-sidebar-foreground"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <button
          type="button"
          onClick={() => setLogsOpen(true)}
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          className={cn(
            'group/logs flex w-fit cursor-pointer items-center gap-1.5 border-r px-3 py-1 text-[11px] font-light tracking-wide transition-colors hover:bg-muted/40 hover:text-foreground',
            hasLogs ? 'text-foreground/80' : 'text-muted-foreground/60'
          )}
          aria-label={hasLogs ? 'View logs' : 'No logs yet'}
        >
          <ScrollText
            className={cn(
              'size-3.5 shrink-0 transition-transform',
              pulsing && 'animate-pulse'
            )}
            strokeWidth={1.5}
          />
          <span className="truncate">logs</span>
          {hasLogs && (
            <span className="text-[10px] tabular-nums text-muted-foreground/60">
              {logCount}
            </span>
          )}
          {pulsing && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_var(--color-emerald-500)]"
              aria-hidden
            />
          )}
        </button>

        <div
          className="flex items-center border-r px-2"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <UpdateIndicator />
        </div>

        <div className="flex flex-1 items-center justify-center text-xs font-medium text-muted-foreground/80">
          MCP-Lookup
        </div>

        <div
          className="group/wc flex items-center gap-2 px-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => void window.api.win.minimize()}
            aria-label="Minimize"
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-primary/40 text-primary-foreground shadow-inner shadow-primary/30 transition-all hover:bg-primary/55 hover:brightness-110 active:scale-95"
          >
            <Minus
              strokeWidth={3}
              className="size-2 opacity-0 transition-opacity group-hover/wc:opacity-100"
            />
          </button>
          <button
            type="button"
            onClick={() => void window.api.win.maximizeToggle()}
            aria-label={maximized ? 'Restore' : 'Maximize'}
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-primary/70 text-primary-foreground shadow-inner shadow-primary/30 transition-all hover:bg-primary/85 hover:brightness-110 active:scale-95"
          >
            <Maximize2
              strokeWidth={2.5}
              className="size-2 opacity-0 transition-opacity group-hover/wc:opacity-100"
            />
          </button>
          <button
            type="button"
            onClick={() => void window.api.win.close()}
            aria-label="Close"
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground shadow-inner shadow-primary/30 transition-all hover:brightness-110 active:scale-95"
          >
            <X
              strokeWidth={2.5}
              className="size-2 opacity-0 transition-opacity group-hover/wc:opacity-100"
            />
          </button>
        </div>
      </div>

      <LogSheet open={logsOpen} onOpenChange={setLogsOpen} />
    </>
  )
}
