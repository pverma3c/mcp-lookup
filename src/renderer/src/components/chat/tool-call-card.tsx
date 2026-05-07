import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { McpLogo } from '@/components/mcp-logo'
import { cn } from '@/lib/utils'
import type { AssistantPart } from '@/lib/chat-types'

type ToolPart = Extract<AssistantPart, { kind: 'tool' }>

interface Props {
  tool: ToolPart
  serverIdByName?: Map<string, string>
}

function formatJson(value: unknown): string {
  if (value === undefined) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

export function ToolCallCard({ tool, serverIdByName }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const dotClass =
    tool.status === 'running'
      ? 'animate-pulse bg-amber-500'
      : tool.status === 'error'
        ? 'bg-destructive'
        : 'bg-emerald-500'

  const accentClass =
    tool.status === 'running'
      ? 'before:bg-amber-500'
      : tool.status === 'error'
        ? 'before:bg-destructive'
        : 'before:bg-emerald-500'

  const argsJson = formatJson(tool.args)
  const outputText = tool.output ?? ''
  const serverId = tool.serverName ? serverIdByName?.get(tool.serverName) : undefined

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border bg-card/40 transition-colors hover:bg-card/70',
        'before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:content-[""]',
        accentClass
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5"
      >
        <span className={cn('size-1.5 shrink-0 rounded-full', dotClass)} aria-hidden />
        <span className="truncate font-mono text-xs font-medium">{tool.toolName}</span>
        {tool.serverName && (
          <Badge
            variant="secondary"
            className="ml-auto cursor-pointer gap-1.5"
            onClick={(e) => {
              e.stopPropagation()
              if (serverId) navigate(`/servers/${serverId}`)
            }}
          >
            <McpLogo className="size-3" />
            <span>{tool.serverName}</span>
          </Badge>
        )}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-muted-foreground transition-transform',
            !tool.serverName && 'ml-auto',
            open && 'rotate-180'
          )}
        />
      </button>
      {open && (
        <div className="divide-y border-t font-mono text-[11px]">
          {argsJson && (
            <section className="px-3 py-2">
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                Arguments
              </div>
              <pre className="whitespace-pre-wrap break-all leading-relaxed">{argsJson}</pre>
            </section>
          )}
          {(outputText || tool.status === 'done' || tool.isError) && (
            <section
              className={cn('px-3 py-2', tool.status !== 'error' && 'bg-muted/30')}
            >
              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                {tool.isError ? 'Error' : 'Output'}
              </div>
              <pre
                className={cn(
                  'whitespace-pre-wrap break-all leading-relaxed',
                  tool.isError && 'text-destructive'
                )}
              >
                {outputText || '(no output)'}
              </pre>
            </section>
          )}
          {tool.status === 'running' && !outputText && (
            <section className="px-3 py-2 text-muted-foreground">Running…</section>
          )}
        </div>
      )}
    </div>
  )
}
