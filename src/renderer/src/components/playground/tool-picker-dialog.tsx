import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, Hammer, Search, X } from 'lucide-react'
import { McpLogo } from '@/components/mcp-logo'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { ServerView, ToolInfo } from '@/lib/mcp-types'

interface ToolEntry {
  server: ServerView
  tool: ToolInfo
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  tools: ToolEntry[]
  selectedKey: string
  onSelect: (key: string) => void
}

export function ToolPickerDialog({
  open,
  onOpenChange,
  tools,
  selectedKey,
  onSelect
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setQuery('')
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => window.clearTimeout(t)
  }, [open])

  const grouped = useMemo(() => {
    const tokens = query
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
    const matches = (name: string): boolean => {
      if (tokens.length === 0) return true
      // Normalise separators so "get_product" reads like "get product".
      const haystack = name.toLowerCase().replace(/[_\-./:]+/g, ' ')
      return tokens.every((t) => haystack.includes(t))
    }
    const out = new Map<string, ToolEntry[]>()
    for (const e of tools) {
      if (!matches(e.tool.name)) continue
      const list = out.get(e.server.name) ?? []
      list.push(e)
      out.set(e.server.name, list)
    }
    return Array.from(out.entries())
  }, [tools, query])

  const totalMatches = grouped.reduce((n, [, list]) => n + list.length, 0)
  const expanded = query.trim().length > 0

  const handlePick = (key: string): void => {
    onSelect(key)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[min(640px,80vh)] max-h-[80vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-[640px]">
        <DialogHeader className="shrink-0 gap-1 border-b px-5 pt-5 pb-3">
          <DialogTitle className="text-base">Pick a tool</DialogTitle>
          <DialogDescription className="text-xs">
            {tools.length} {tools.length === 1 ? 'tool' : 'tools'} across connected servers.
          </DialogDescription>
        </DialogHeader>

        <div className="shrink-0 px-5 py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by tool name"
              className="pr-9 pl-9"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label="Clear search"
                className="absolute top-1/2 right-2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          {query && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              {totalMatches} {totalMatches === 1 ? 'match' : 'matches'}
            </p>
          )}
        </div>

        <div className="schema-scroll min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {grouped.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              No tools match “{query}”.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {grouped.map(([serverName, entries]) => (
                <details
                  key={serverName}
                  open={expanded || entries.some((e) => `${e.server.id}::${e.tool.name}` === selectedKey)}
                  className="group/srv rounded-lg border bg-muted/20 open:bg-muted/30"
                >
                  <summary className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-sm select-none hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open/srv:rotate-0 -rotate-90" />
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_4px_var(--color-emerald-500)]"
                      aria-hidden
                    />
                    <span className="truncate font-medium">{serverName}</span>
                    <Badge variant="outline" className="ml-auto h-5 font-mono text-[10px]">
                      {entries.length}
                    </Badge>
                  </summary>
                  <ul className="border-t">
                    {entries.map(({ server, tool }) => {
                      const key = `${server.id}::${tool.name}`
                      const active = key === selectedKey
                      return (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => handlePick(key)}
                            className={cn(
                              'flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/50',
                              active && 'bg-primary/10 hover:bg-primary/15'
                            )}
                          >
                            <McpLogo
                              className={cn(
                                'mt-0.5 size-3.5 shrink-0',
                                active ? 'text-primary' : 'text-muted-foreground'
                              )}
                            />
                            <span className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                              <span
                                className={cn(
                                  'truncate font-mono text-sm',
                                  active && 'text-primary'
                                )}
                              >
                                {tool.name}
                              </span>
                              {tool.description && (
                                <span className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                                  {tool.description}
                                </span>
                              )}
                            </span>
                            {active && (
                              <Badge variant="default" className="h-5 px-1.5 text-[9px]">
                                selected
                              </Badge>
                            )}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </details>
              ))}
            </div>
          )}
        </div>

        {tools.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-5 pb-5 text-xs text-muted-foreground">
            <Hammer className="size-5 opacity-40" />
            No connected servers expose tools yet.
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
