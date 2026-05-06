import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, Bot, Check, ChevronDown, Plus, Square, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { McpBrandLogo } from '@/components/mcp-brand-logo'
import { ChatMessage } from '@/components/chat/chat-message'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { useChat } from '@/hooks/use-chat'
import { useProviders } from '@/hooks/use-providers'
import { useServers } from '@/hooks/use-servers'
import { useServerContext } from '@/hooks/use-server-context'
import { PROVIDER_LABELS } from '@/lib/llm-types'

const PROVIDER_KEY = 'mcp-lookup:chat-provider'

const SUGGESTIONS = [
  {
    title: 'List the available tools',
    prompt: 'What tools are available across the connected MCP servers?'
  },
  {
    title: 'Inspect a tool',
    prompt: 'Pick one tool and explain what it does and its required arguments.'
  },
  {
    title: 'Run a quick test',
    prompt: 'Call the simplest read-only tool and summarize the result.'
  },
  {
    title: 'Show server capabilities',
    prompt: 'For each connected server, summarize tools, prompts, and resources it exposes.'
  }
]

function Chat(): React.JSX.Element {
  const { providers } = useProviders()
  const { servers } = useServers()
  const { summary } = useServerContext()
  const { messages, running, send, cancel, clear } = useChat()
  const [input, setInput] = useState('')
  const [providerId, setProviderId] = useState<string>(
    () => localStorage.getItem(PROVIDER_KEY) ?? ''
  )

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const stickRef = useRef(true)

  useEffect(() => {
    if (!providerId && providers.length > 0) {
      setProviderId(providers[0].id)
    }
  }, [providers, providerId])

  useEffect(() => {
    if (providerId) localStorage.setItem(PROVIDER_KEY, providerId)
  }, [providerId])

  useEffect(() => {
    const el = scrollRef.current
    if (!el || !stickRef.current) return
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const onScroll = (): void => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96
  }

  const serverIdByName = useMemo(() => {
    const m = new Map<string, string>()
    for (const s of servers) m.set(s.name, s.id)
    return m
  }, [servers])

  const selectedProvider = providers.find((p) => p.id === providerId)

  const handleSend = (): void => {
    if (!providerId || !input.trim() || running) return
    send(providerId, input)
    setInput('')
    stickRef.current = true
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    } else if (e.key === 'Escape' && running) {
      e.preventDefault()
      cancel()
    }
  }

  const noProvider = providers.length === 0
  const empty = messages.length === 0

  return (
    <div className="relative flex h-full flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-80 bg-[radial-gradient(50%_60%_at_50%_0%,var(--color-muted)_0%,transparent_70%)] opacity-60"
      />
      <div ref={scrollRef} onScroll={onScroll} className="schema-scroll flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-10 px-6 pt-12 pb-56">
          {empty ? (
            <div className="flex flex-col items-center gap-6 pt-16 text-center">
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute inset-0 -z-10 rounded-full bg-gradient-to-br from-indigo-500/20 to-transparent blur-2xl"
                />
                <McpBrandLogo className="size-16" />
              </div>
              <div className="flex flex-col items-center gap-2">
                <h1 className="text-balance text-3xl font-semibold tracking-tight">
                  What should we test?
                </h1>
                <p className="max-w-sm text-sm text-muted-foreground">
                  Ask a question and the agent will pick tools from your connected MCP
                  servers.
                </p>
              </div>

              {(summary.length === 0 || noProvider) && (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {summary.length === 0 && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/">
                        <Plus /> Connect an MCP server
                      </Link>
                    </Button>
                  )}
                  {noProvider && (
                    <Button asChild variant="outline" size="sm">
                      <Link to="/providers">
                        <Bot /> Add an LLM provider
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              {summary.length > 0 && !noProvider && (
                <div className="grid w-full max-w-lg grid-cols-1 gap-2 pt-2 sm:grid-cols-2">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => setInput(s.prompt)}
                      className="group flex flex-col items-start gap-0.5 rounded-xl border bg-card/40 px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:bg-card hover:shadow-sm"
                    >
                      <span className="text-sm font-medium">{s.title}</span>
                      <span className="line-clamp-1 text-xs text-muted-foreground">
                        {s.prompt}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            messages.map((m) => (
              <ChatMessage
                key={m.id}
                message={m}
                running={running}
                serverIdByName={serverIdByName}
              />
            ))
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <div className="h-16 bg-gradient-to-t from-background to-transparent" />
        <div className="bg-background px-6 pb-6 pt-2">
          <div className="pointer-events-auto mx-auto flex max-w-2xl flex-col gap-2.5">
            <div className="flex flex-wrap items-center gap-2 px-1">
              {summary.length === 0 ? (
                <span className="text-xs text-muted-foreground">
                  No MCP servers connected.
                </span>
              ) : (
                summary.map((s) => (
                  <Badge
                    key={s.id}
                    variant="outline"
                    asChild
                    className="cursor-pointer gap-1.5"
                  >
                    <Link to={`/servers/${s.id}`}>
                      <span
                        className="size-1.5 rounded-full bg-emerald-500"
                        aria-hidden
                      />
                      <span className="font-medium">{s.name}</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{s.toolCount} tools</span>
                    </Link>
                  </Badge>
                ))
              )}

              {messages.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clear}
                  className="ml-auto h-7 text-xs"
                >
                  <Trash2 /> Clear
                </Button>
              )}
            </div>

            <div
              className={cn(
                'group relative flex flex-col rounded-3xl border bg-card transition-all duration-200',
                'shadow-[0_1px_0_0_var(--border),0_10px_32px_-16px_rgb(0_0_0/0.22)]',
                'hover:border-foreground/20 hover:shadow-[0_1px_0_0_var(--border),0_14px_36px_-16px_rgb(0_0_0/0.28)]',
                'focus-within:border-ring focus-within:ring-4 focus-within:ring-ring/15',
                noProvider && 'pointer-events-none opacity-60'
              )}
            >
              <Textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={noProvider}
                placeholder={
                  noProvider
                    ? 'Add an LLM provider to start chatting…'
                    : 'Ask anything…'
                }
                className="field-sizing-content max-h-48 min-h-[3.5rem] resize-none border-0 bg-transparent px-5 pt-4 pb-1 text-base leading-relaxed shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />

              <div className="flex items-center gap-1.5 px-2 pb-2 pt-1">
                {noProvider ? (
                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1.5 rounded-full px-3 text-xs"
                  >
                    <Link to="/providers">
                      <Bot className="size-3.5" /> Add provider
                    </Link>
                  </Button>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          'group/provider inline-flex h-8 max-w-[200px] cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
                          'hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none data-[state=open]:bg-muted/70'
                        )}
                      >
                        <span
                          className="size-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_6px_var(--color-emerald-500)]"
                          aria-hidden
                        />
                        <span className="truncate">
                          {selectedProvider?.name ?? 'Select provider'}
                        </span>
                        <ChevronDown className="size-3 shrink-0 text-muted-foreground transition-transform group-data-[state=open]/provider:rotate-180" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      side="top"
                      align="start"
                      sideOffset={8}
                      className="w-[260px] rounded-2xl"
                    >
                      {providers.map((p) => (
                        <DropdownMenuItem
                          key={p.id}
                          onSelect={() => setProviderId(p.id)}
                          className="flex items-start gap-2 py-2"
                        >
                          <div className="flex min-w-0 flex-1 flex-col items-start gap-0.5">
                            <span className="truncate font-medium">{p.name}</span>
                            <span className="truncate font-mono text-[10px] text-muted-foreground">
                              {PROVIDER_LABELS[p.config.type]} · {p.config.model}
                            </span>
                          </div>
                          {p.id === providerId && (
                            <Check className="mt-0.5 size-3.5 text-emerald-500" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}

                <div className="ml-auto flex items-center gap-1.5">
                  {input.length > 200 && !running && (
                    <span className="text-[10px] tabular-nums text-muted-foreground">
                      {input.length}
                    </span>
                  )}
                  {running ? (
                    <Button
                      type="button"
                      size="icon-sm"
                      variant="destructive"
                      onClick={cancel}
                      className="size-8 rounded-full transition-transform active:scale-90"
                      aria-label="Stop"
                    >
                      <Square className="size-3 fill-current" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="icon-sm"
                      disabled={!input.trim() || noProvider}
                      onClick={handleSend}
                      className="size-8 rounded-full transition-transform active:scale-90 disabled:opacity-40"
                      aria-label="Send"
                    >
                      <ArrowUp className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Chat
