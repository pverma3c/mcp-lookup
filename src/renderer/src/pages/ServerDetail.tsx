import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnimatePresence, motion, LayoutGroup } from 'framer-motion'
import {
  ArrowLeft,
  FileText,
  Hammer,
  LayoutGrid,
  List,
  Loader2,
  MessageSquareText,
  PlugZap,
  Search,
  SquareLibrary,
  Text,
  TriangleAlert,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { McpLogo } from '@/components/mcp-logo'
import { ServerOutput } from '@/components/server-output'
import { ToolSchemaSheet } from '@/components/tool-schema-sheet'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from '@/components/ui/empty'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { ButtonGroup } from '@/components/ui/button-group'
import { Toggle } from '@/components/ui/toggle'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useServers } from '@/hooks/use-servers'
import { cn } from '@/lib/utils'
import type { ServerStatus, ToolInfo } from '@/lib/mcp-types'

const STATUS_LABEL: Record<ServerStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting',
  connected: 'Connected',
  error: 'Error'
}

const STATUS_DOT: Record<ServerStatus, string> = {
  disconnected: 'bg-muted-foreground/40',
  connecting: 'bg-amber-500',
  connected: 'bg-emerald-500',
  error: 'bg-destructive'
}

function ServerDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const { servers, loading } = useServers()
  const server = servers.find((s) => s.id === id)
  const [activeTool, setActiveTool] = useState<ToolInfo | null>(null)
  const [toolQuery, setToolQuery] = useState('')
  const [searchInDescription, setSearchInDescription] = useState(false)
  const [toolView, setToolView] = useState<'row' | 'grid'>(
    () => (localStorage.getItem('mcp-lookup:tool-view') as 'row' | 'grid') ?? 'row'
  )

  const updateToolView = (v: 'row' | 'grid'): void => {
    setToolView(v)
    localStorage.setItem('mcp-lookup:tool-view', v)
  }

  const filteredTools = useMemo(() => {
    if (!server) return []
    const disabledSet = new Set(server.disabledTools)
    const q = toolQuery.trim().toLowerCase()
    const filtered = q
      ? server.runtime.tools.filter((t) => {
          if (t.name.toLowerCase().includes(q)) return true
          if (searchInDescription && (t.description ?? '').toLowerCase().includes(q)) return true
          return false
        })
      : server.runtime.tools
    return [...filtered].sort((a, b) => {
      const aDisabled = disabledSet.has(a.name) ? 1 : 0
      const bDisabled = disabledSet.has(b.name) ? 1 : 0
      if (aDisabled !== bDisabled) return aDisabled - bDisabled
      return a.name.localeCompare(b.name)
    })
  }, [server, toolQuery, searchInDescription])

  // Defer re-sort until the cursor leaves the list, so toggling a switch
  // doesn't yank the row out from under the user's mouse.
  const sortFrozenRef = useRef(false)
  const [displayedTools, setDisplayedTools] = useState<ToolInfo[]>(filteredTools)

  useEffect(() => {
    setDisplayedTools((prev) => {
      const incoming = new Map(filteredTools.map((t) => [t.name, t]))
      if (!sortFrozenRef.current) return filteredTools
      // Hovering: keep the previous order, but pick up any updated tool fields
      // and append/remove entries whose membership in `filteredTools` changed.
      const kept: ToolInfo[] = []
      const seen = new Set<string>()
      for (const t of prev) {
        const next = incoming.get(t.name)
        if (next) {
          kept.push(next)
          seen.add(next.name)
        }
      }
      for (const t of filteredTools) if (!seen.has(t.name)) kept.push(t)
      return kept
    })
  }, [filteredTools])

  const handleListEnter = (): void => {
    sortFrozenRef.current = true
  }
  const handleListLeave = (): void => {
    sortFrozenRef.current = false
    setDisplayedTools(filteredTools)
  }

  const defaultTab = useMemo(() => {
    if (!server) return 'tools'
    const c = server.runtime.capabilities
    if (c.tools) return 'tools'
    if (c.prompts) return 'prompts'
    if (c.resources) return 'resources'
    return 'tools'
  }, [server])

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading…
      </div>
    )
  }

  if (!server) {
    return (
      <div className="p-6">
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <TriangleAlert />
            </EmptyMedia>
            <EmptyTitle>Server not found</EmptyTitle>
            <EmptyDescription>It may have been deleted.</EmptyDescription>
          </EmptyHeader>
          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft /> Back to dashboard
            </Link>
          </Button>
        </Empty>
      </div>
    )
  }

  const { runtime } = server
  const status = runtime.status
  const transportLabel =
    server.config.transport === 'stdio'
      ? 'Stdio'
      : server.config.transport === 'http'
        ? 'HTTP'
        : 'SSE'

  const handleConnect = async (): Promise<void> => {
    if (status !== 'connected') {
      await window.api.mcp.connect(server.id)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{server.name}</h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{transportLabel}</Badge>
          <Separator orientation="vertical" className="h-4" />
          <span className={cn('size-2 rounded-full', STATUS_DOT[status])} aria-hidden />
          <span>{STATUS_LABEL[status]}</span>
          {status === 'connected' && (
            <>
              <Separator orientation="vertical" className="h-4" />
              {runtime.capabilities.tools && (
                <Badge variant="secondary" className="gap-1">
                  <Hammer className="size-3" />
                  {runtime.tools.length} tools
                </Badge>
              )}
              {runtime.capabilities.prompts && (
                <Badge variant="secondary" className="gap-1">
                  <MessageSquareText className="size-3" />
                  {runtime.prompts.length} prompts
                </Badge>
              )}
              {runtime.capabilities.resources && (
                <Badge variant="secondary" className="gap-1">
                  <SquareLibrary className="size-3" />
                  {runtime.resources.length} resources
                </Badge>
              )}
            </>
          )}
        </div>
      </header>

      {status === 'error' && runtime.error && (
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Connection failed</AlertTitle>
          <AlertDescription>{runtime.error}</AlertDescription>
        </Alert>
      )}

      <ServerOutput serverId={server.id} defaultOpen={status === 'error'} />

      {status !== 'connected' ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <PlugZap />
            </EmptyMedia>
            <EmptyTitle>Not connected</EmptyTitle>
            <EmptyDescription>
              Connect to discover the server&apos;s tools, prompts, and resources.
            </EmptyDescription>
          </EmptyHeader>
          <Button onClick={handleConnect} disabled={status === 'connecting'}>
            <PlugZap /> Connect
          </Button>
        </Empty>
      ) : (
        <Tabs defaultValue={defaultTab}>
          <TabsList>
            {runtime.capabilities.tools && (
              <TabsTrigger value="tools">
                <Hammer /> Tools
                <Badge variant="secondary" className="ml-1.5">
                  {runtime.tools.length}
                </Badge>
              </TabsTrigger>
            )}
            {runtime.capabilities.prompts && (
              <TabsTrigger value="prompts">
                <MessageSquareText /> Prompts
                <Badge variant="secondary" className="ml-1.5">
                  {runtime.prompts.length}
                </Badge>
              </TabsTrigger>
            )}
            {runtime.capabilities.resources && (
              <TabsTrigger value="resources">
                <SquareLibrary /> Resources
                <Badge variant="secondary" className="ml-1.5">
                  {runtime.resources.length}
                </Badge>
              </TabsTrigger>
            )}
          </TabsList>

          {runtime.capabilities.tools && (
            <TabsContent value="tools" className="mt-4 flex flex-col gap-3">
              {runtime.tools.length === 0 ? (
                <EmptyState icon={<Hammer />} title="No tools" />
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <ToolsCount
                        total={runtime.tools.length}
                        disabled={
                          runtime.tools.filter((t) =>
                            server.disabledTools.includes(t.name)
                          ).length
                        }
                      />
                      {(() => {
                        const disabledCount = runtime.tools.filter((t) =>
                          server.disabledTools.includes(t.name)
                        ).length
                        const allDisabled = disabledCount === runtime.tools.length
                        return (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={async () => {
                              const target = !allDisabled
                              try {
                                if (window.api.mcp.setAllTools) {
                                  await window.api.mcp.setAllTools(server.id, target)
                                } else {
                                  await Promise.all(
                                    runtime.tools.map((t) =>
                                      window.api.mcp.toggleTool(server.id, t.name, target)
                                    )
                                  )
                                }
                                toast.success(target ? 'All tools disabled' : 'All tools enabled')
                              } catch (err) {
                                toast.error(
                                  err instanceof Error ? err.message : 'Failed to update tools'
                                )
                              }
                            }}
                          >
                            {allDisabled ? 'Enable all' : 'Disable all'}
                          </Button>
                        )
                      })()}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative w-full max-w-xs">
                        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={toolQuery}
                          onChange={(e) => setToolQuery(e.target.value)}
                          placeholder={
                            searchInDescription
                              ? 'Search name or description…'
                              : 'Search name…'
                          }
                          className="h-8 pl-8 pr-8"
                        />
                        {toolQuery && (
                          <button
                            type="button"
                            onClick={() => setToolQuery('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
                            aria-label="Clear search"
                          >
                            <X className="size-3.5" />
                          </button>
                        )}
                      </div>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Toggle
                            size="sm"
                            pressed={searchInDescription}
                            onPressedChange={setSearchInDescription}
                            aria-label="Include descriptions in search"
                          >
                            <Text />
                          </Toggle>
                        </TooltipTrigger>
                        <TooltipContent>
                          {searchInDescription
                            ? 'Searching name and description. Click to search name only.'
                            : 'Searching name only. Click to also search descriptions.'}
                        </TooltipContent>
                      </Tooltip>
                      <Separator orientation="vertical" className="h-6" />
                      <ButtonGroup aria-label="Tool view">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant={toolView === 'row' ? 'default' : 'outline'}
                              size="icon-sm"
                              onClick={() => updateToolView('row')}
                              aria-label="Row view"
                              aria-pressed={toolView === 'row'}
                            >
                              <List />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Row view</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant={toolView === 'grid' ? 'default' : 'outline'}
                              size="icon-sm"
                              onClick={() => updateToolView('grid')}
                              aria-label="Grid view"
                              aria-pressed={toolView === 'grid'}
                            >
                              <LayoutGrid />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Grid view</TooltipContent>
                        </Tooltip>
                      </ButtonGroup>
                    </div>
                  </div>
                  {filteredTools.length === 0 ? (
                    <EmptyState
                      icon={<Search />}
                      title={`No tools match "${toolQuery}"`}
                    />
                  ) : (
                  <AnimatePresence mode="wait" initial={false}>
                  {toolView === 'row' ? (
                    <motion.div
                      key="row"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                    <LayoutGroup id="tools-row">
                    <ul
                      className="divide-y rounded-lg border"
                      onMouseEnter={handleListEnter}
                      onMouseLeave={handleListLeave}
                    >
                      {displayedTools.map((tool) => {
                        const disabled = server.disabledTools.includes(tool.name)
                        return (
                          <motion.li
                            key={tool.name}
                            layout
                            transition={{
                              layout: { type: 'spring', stiffness: 420, damping: 38 }
                            }}
                            animate={{ opacity: disabled ? 0.55 : 1 }}
                            className={cn(
                              'group flex items-center gap-4 px-4 py-3 hover:bg-muted/50'
                            )}
                          >
                            <button
                              type="button"
                              className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
                              onClick={() => setActiveTool(tool)}
                            >
                              <McpLogo className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                              <span className="flex min-w-0 flex-col items-start gap-0.5">
                                <span className="truncate font-mono text-sm font-medium">
                                  {tool.name}
                                </span>
                                {tool.description && (
                                  <span className="line-clamp-1 text-xs text-muted-foreground">
                                    {tool.description}
                                  </span>
                                )}
                              </span>
                            </button>
                            <Switch
                              checked={!disabled}
                              onCheckedChange={(on) =>
                                window.api.mcp.toggleTool(server.id, tool.name, !on)
                              }
                              aria-label={`Toggle ${tool.name}`}
                            />
                          </motion.li>
                        )
                      })}
                    </ul>
                    </LayoutGroup>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                    <LayoutGroup id="tools-grid">
                    <ul
                      className="grid grid-cols-1 overflow-hidden rounded-lg border sm:grid-cols-2 xl:grid-cols-3"
                      onMouseEnter={handleListEnter}
                      onMouseLeave={handleListLeave}
                    >
                      {displayedTools.map((tool) => {
                        const disabled = server.disabledTools.includes(tool.name)
                        return (
                          <motion.li
                            key={tool.name}
                            layout
                            transition={{
                              layout: { type: 'spring', stiffness: 420, damping: 38 }
                            }}
                            animate={{ opacity: disabled ? 0.55 : 1 }}
                            className={cn(
                              'group flex flex-col gap-2 border-b border-r p-4 hover:bg-muted/50'
                            )}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <button
                                type="button"
                                className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                                onClick={() => setActiveTool(tool)}
                              >
                                <McpLogo className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                                <span className="truncate font-mono text-sm font-medium">
                                  {tool.name}
                                </span>
                              </button>
                              <Switch
                                checked={!disabled}
                                onCheckedChange={(on) =>
                                  window.api.mcp.toggleTool(server.id, tool.name, !on)
                                }
                                aria-label={`Toggle ${tool.name}`}
                              />
                            </div>
                            {tool.description && (
                              <button
                                type="button"
                                onClick={() => setActiveTool(tool)}
                                className="cursor-pointer text-left text-xs text-muted-foreground line-clamp-3"
                              >
                                {tool.description}
                              </button>
                            )}
                          </motion.li>
                        )
                      })}
                    </ul>
                    </LayoutGroup>
                    </motion.div>
                  )}
                  </AnimatePresence>
                  )}
                </>
              )}
            </TabsContent>
          )}

          {runtime.capabilities.prompts && (
            <TabsContent value="prompts" className="mt-4">
              {runtime.prompts.length === 0 ? (
                <EmptyState icon={<MessageSquareText />} title="No prompts" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {runtime.prompts.map((prompt) => (
                    <li key={prompt.name} className="flex flex-col gap-1 px-4 py-3">
                      <span className="font-mono text-sm font-medium">{prompt.name}</span>
                      {prompt.description && (
                        <span className="text-xs text-muted-foreground">{prompt.description}</span>
                      )}
                      {prompt.arguments && prompt.arguments.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {prompt.arguments.map((a) => (
                            <Badge key={a.name} variant="outline" className="font-mono text-[10px]">
                              {a.name}
                              {a.required ? '*' : ''}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          )}

          {runtime.capabilities.resources && (
            <TabsContent value="resources" className="mt-4">
              {runtime.resources.length === 0 ? (
                <EmptyState icon={<FileText />} title="No resources" />
              ) : (
                <ul className="divide-y rounded-lg border">
                  {runtime.resources.map((res) => (
                    <li key={res.uri} className="flex flex-col gap-1 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium">
                          {res.name ?? res.uri}
                        </span>
                        {res.mimeType && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {res.mimeType}
                          </Badge>
                        )}
                      </div>
                      <span className="truncate font-mono text-xs text-muted-foreground">
                        {res.uri}
                      </span>
                      {res.description && (
                        <span className="text-xs text-muted-foreground">{res.description}</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}

      <ToolSchemaSheet
        tool={activeTool}
        open={activeTool !== null}
        onOpenChange={(open) => !open && setActiveTool(null)}
      />
    </div>
  )
}

function ToolsCount({
  total,
  disabled
}: {
  total: number
  disabled: number
}): React.JSX.Element {
  const active = total - disabled
  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden />
        <span>
          <span className="font-medium text-foreground">{active}</span> active
        </span>
      </span>
      {disabled > 0 && (
        <>
          <span className="text-muted-foreground/40">·</span>
          <span className="inline-flex items-center gap-1.5">
            <span className="size-1.5 rounded-full bg-muted-foreground/50" aria-hidden />
            <span>
              <span className="font-medium text-foreground">{disabled}</span> disabled
            </span>
          </span>
        </>
      )}
    </div>
  )
}

function EmptyState({
  icon,
  title
}: {
  icon: React.ReactNode
  title: string
}): React.JSX.Element {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">{icon}</EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
      </EmptyHeader>
    </Empty>
  )
}

export default ServerDetail
