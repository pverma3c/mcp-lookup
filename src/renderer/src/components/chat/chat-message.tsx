import { McpLogo } from '@/components/mcp-logo'
import { Markdown } from '@/components/chat/markdown'
import { ToolCallCard } from '@/components/chat/tool-call-card'
import { cn } from '@/lib/utils'
import type { DisplayMessage } from '@/lib/chat-types'

interface Props {
  message: DisplayMessage
  running: boolean
  serverIdByName: Map<string, string>
}

export function ChatMessage({ message, running, serverIdByName }: Props): React.JSX.Element {
  if (message.role === 'user') {
    const text = message.parts[0]?.kind === 'text' ? message.parts[0].text : ''
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-muted/70 px-4 py-2.5 text-sm leading-relaxed">
          {text}
        </div>
      </div>
    )
  }

  const isStreaming = running && !message.done
  const lastIsText = message.parts[message.parts.length - 1]?.kind === 'text'

  return (
    <div className="group/turn relative flex flex-col gap-3 pl-6">
      <McpLogo
        className={cn(
          'absolute left-0 top-1 size-4 text-muted-foreground/80',
          isStreaming && 'animate-pulse text-foreground'
        )}
      />
      <div className="flex flex-col gap-3">
        {message.parts.length === 0 && isStreaming && (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-1.5 animate-pulse rounded-full bg-foreground/60" />
            Thinking…
          </div>
        )}
        {message.parts.map((part, i) => {
          if (part.kind === 'text') {
            const isLast = i === message.parts.length - 1
            return (
              <div key={i} className="relative">
                <Markdown>{part.text}</Markdown>
                {isLast && isStreaming && lastIsText && (
                  <span className="ml-0.5 inline-block h-3.5 w-1.5 -translate-y-px animate-pulse rounded-sm bg-foreground/70 align-middle" />
                )}
              </div>
            )
          }
          return <ToolCallCard key={i} tool={part} serverIdByName={serverIdByName} />
        })}
        {message.error && (
          <div
            className={cn(
              'rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive'
            )}
          >
            {message.error}
          </div>
        )}
      </div>
    </div>
  )
}
