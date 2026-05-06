import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Eraser, Terminal } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useServerLogs } from '@/hooks/use-server-logs'
import { cn } from '@/lib/utils'

interface Props {
  serverId: string
  defaultOpen?: boolean
}

export function ServerOutput({ serverId, defaultOpen = false }: Props): React.JSX.Element | null {
  const { lines, clear } = useServerLogs(serverId)
  const [open, setOpen] = useState(defaultOpen)
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [lines, open])

  if (lines.length === 0) return null

  const errorPattern = /\b(error|failed|exception|fatal|EACCES|ENOENT|EADDRINUSE|CERT_)\b/i
  const issueCount = lines.filter((l) => errorPattern.test(l.message)).length

  return (
    <section className="rounded-lg border">
      <header className="flex items-center justify-between gap-3 px-4 py-2.5">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex cursor-pointer items-center gap-2 text-sm font-medium"
        >
          <Terminal className="size-4 text-muted-foreground" />
          <span>Output</span>
          <Badge variant="secondary" className="font-mono">
            {lines.length}
          </Badge>
          {issueCount > 0 && (
            <Badge variant="destructive" className="font-mono">
              {issueCount} issue{issueCount === 1 ? '' : 's'}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              open && 'rotate-180'
            )}
          />
        </button>
        <Button variant="ghost" size="sm" onClick={() => void clear()}>
          <Eraser /> Clear
        </Button>
      </header>
      {open && (
        <div
          ref={scrollRef}
          className="schema-scroll max-h-72 overflow-auto border-t bg-muted/30 px-4 py-3 font-mono text-xs leading-relaxed"
        >
          {lines.map((line, i) => {
            const isIssue = errorPattern.test(line.message)
            return (
              <div key={i} className="flex gap-3">
                <span
                  className={cn(
                    'shrink-0 text-[10px] uppercase tracking-wide opacity-60',
                    line.source === 'system' && 'text-foreground'
                  )}
                >
                  {line.source === 'system' ? 'sys' : 'out'}
                </span>
                <span
                  className={cn(
                    'whitespace-pre-wrap break-all',
                    line.source === 'system'
                      ? 'text-foreground'
                      : isIssue
                        ? 'text-destructive'
                        : 'text-muted-foreground'
                  )}
                >
                  {line.message}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
