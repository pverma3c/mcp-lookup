import { useEffect, useState } from 'react'
import { Maximize2, Minus, X } from 'lucide-react'
import { LogSheet } from '@/components/log-sheet'
import { Matrix, loader, pulse, snake, wave } from '@/components/ui/matrix'
import type { Frame } from '@/components/ui/matrix'

const ROWS = 7
const COLS = 7
const EMPTY_PATTERN: Frame = Array.from({ length: ROWS }, () => Array(COLS).fill(0))

const ANIMATIONS = [
  { name: 'wave', frames: wave, fps: 20 },
  { name: 'pulse', frames: pulse, fps: 14 },
  { name: 'snake', frames: snake, fps: 24 },
  { name: 'loader', frames: loader, fps: 18 }
] as const

export function TitleBar(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)
  const [logsOpen, setLogsOpen] = useState(false)
  const [hasLogs, setHasLogs] = useState(false)
  const [pulsing, setPulsing] = useState(false)

  useEffect(() => {
    void window.api.win.isMaximized().then(setMaximized)
    return window.api.win.onMaximizedChange(setMaximized)
  }, [])

  useEffect(() => {
    let active = true
    void window.api.mcp.getAllLogs().then((lines) => {
      if (active) setHasLogs(lines.length > 0)
    })
    const off = window.api.mcp.onServerLog(() => {
      setHasLogs(true)
      setPulsing(true)
      window.setTimeout(() => setPulsing(false), 1200)
    })
    return () => {
      active = false
      off()
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
          className="flex w-[10%] min-w-[120px] cursor-pointer items-center justify-center gap-1.5 overflow-hidden border-r px-2 py-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          aria-label={hasLogs ? 'View logs' : 'No logs yet'}
        >
          {ANIMATIONS.map((a) => (
            <Matrix
              key={a.name}
              rows={ROWS}
              cols={COLS}
              frames={hasLogs ? a.frames : undefined}
              pattern={hasLogs ? undefined : EMPTY_PATTERN}
              fps={pulsing ? a.fps + 6 : a.fps}
              autoplay={hasLogs}
              loop
              palette={{ on: 'currentColor', off: 'currentColor' }}
              brightness={hasLogs ? 1 : 0.4}
              ariaLabel={`${a.name} animation`}
              className="block h-full shrink-0 [&_svg]:h-full [&_svg]:w-auto"
            />
          ))}
        </button>

        <div className="flex flex-1 items-center justify-center text-xs font-medium text-muted-foreground/80">
          mcp-lookup
        </div>

        <div
          className="group/wc flex items-center gap-2 px-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            type="button"
            onClick={() => void window.api.win.minimize()}
            aria-label="Minimize"
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-blue-500 text-blue-950/70 shadow-inner shadow-blue-900/20 transition-all hover:brightness-110 active:scale-95"
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
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-emerald-500 text-emerald-950/70 shadow-inner shadow-emerald-900/20 transition-all hover:brightness-110 active:scale-95"
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
            className="flex size-3.5 cursor-pointer items-center justify-center rounded-full bg-red-500 text-red-950/70 shadow-inner shadow-red-900/20 transition-all hover:brightness-110 active:scale-95"
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
