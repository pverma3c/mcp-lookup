import { useEffect, useMemo, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useServers } from '@/hooks/use-servers'
import { cn } from '@/lib/utils'
import type { LogLine } from '@/lib/mcp-types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const ERROR_PATTERN = /\b(error|failed|exception|fatal|EACCES|ENOENT|EADDRINUSE|CERT_)\b/i

export function LogSheet({ open, onOpenChange }: Props): React.JSX.Element {
  const { servers } = useServers()
  const [lines, setLines] = useState<LogLine[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  const serverNameById = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of servers) m.set(s.id, s.name)
    return m
  }, [servers])

  useEffect(() => {
    if (!open) return
    let active = true
    void window.api.mcp.getAllLogs().then((existing) => {
      if (!active) return
      setLines(existing)
    })

    const off = window.api.mcp.onServerLog((line) => {
      setLines((prev) => {
        const next = [...prev, line]
        return next.length > 2000 ? next.slice(next.length - 2000) : next
      })
    })

    return () => {
      active = false
      off()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines, open])

  const handleClear = async (): Promise<void> => {
    for (const s of servers) await window.api.mcp.clearLogs(s.id)
    setLines([])
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="top"
        className="flex h-screen w-screen flex-col gap-0 p-0 sm:max-w-none"
      >
        <SheetHeader className="flex-row items-center justify-between gap-3 border-b px-6 py-4 pr-16">
          <div className="flex flex-col gap-0.5">
            <SheetTitle>Logs</SheetTitle>
            <p className="text-xs text-muted-foreground">
              Aggregated output across all MCP servers · {lines.length} lines
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            disabled={lines.length === 0}
          >
            <Eraser /> Clear all
          </Button>
        </SheetHeader>

        <div
          ref={scrollRef}
          className="schema-scroll min-h-0 flex-1 overflow-auto bg-muted/20 px-6 py-4 font-mono text-xs leading-relaxed"
        >
          {lines.length === 0 ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              No log output yet — connect a server and tail along.
            </div>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {lines.map((line, i) => {
                const isBackend = line.source === 'backend'
                const isIssue = ERROR_PATTERN.test(line.message)
                const time = new Date(line.timestamp).toLocaleTimeString()
                const sourceName = isBackend
                  ? 'app'
                  : serverNameById.get(line.serverId) ?? line.serverId.slice(0, 6)
                const tag = isBackend
                  ? line.level ?? 'log'
                  : line.source === 'system'
                    ? 'sys'
                    : 'out'
                const isError = isBackend ? line.level === 'error' : isIssue
                const isWarn = isBackend && line.level === 'warn'
                return (
                  <li key={i} className="flex gap-3">
                    <span className="w-20 shrink-0 text-[10px] text-muted-foreground/70">
                      {time}
                    </span>
                    <span
                      className={cn(
                        'w-32 shrink-0 truncate text-[11px] font-medium',
                        isBackend ? 'text-violet-500' : 'text-foreground/80'
                      )}
                    >
                      {isBackend ? '◆ app' : sourceName}
                    </span>
                    <span
                      className={cn(
                        'w-12 shrink-0 text-[10px] uppercase tracking-wide opacity-60',
                        isError && 'text-destructive opacity-80',
                        isWarn && 'text-amber-500 opacity-80',
                        !isError && !isWarn && line.source === 'system' && 'text-foreground'
                      )}
                    >
                      {tag}
                    </span>
                    <span
                      className={cn(
                        'min-w-0 flex-1 whitespace-pre-wrap break-all',
                        isError
                          ? 'text-destructive'
                          : isWarn
                            ? 'text-amber-600 dark:text-amber-400'
                            : isBackend
                              ? 'text-violet-200 dark:text-violet-300/90'
                              : line.source === 'system'
                                ? 'text-foreground'
                                : 'text-muted-foreground'
                      )}
                    >
                      {line.message}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
