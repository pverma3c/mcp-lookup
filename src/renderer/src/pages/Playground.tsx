import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import {
  AlertCircle,
  Beaker,
  Check,
  Copy,
  Hammer,
  PlugZap,
  Sparkles,
  Wand2
} from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { ChevronDown } from 'lucide-react'
import { ToolPickerDialog } from '@/components/playground/tool-picker-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { JsonViewer } from '@/components/json-view'
import { McpLogo } from '@/components/mcp-logo'
import { SchemaForm } from '@/components/playground/schema-form'
import { useServers } from '@/hooks/use-servers'
import { clearPlaygroundActions, setPlaygroundActions } from '@/lib/playground-actions'
import { cn } from '@/lib/utils'
import type { ServerView, ToolInfo } from '@/lib/mcp-types'

type JSONObject = Record<string, unknown>

interface ToolEntry {
  server: ServerView
  tool: ToolInfo
}

interface RunResult {
  result: unknown
  latencyMs: number
  inputBytes: number
  outputBytes: number
}

function bytesOf(value: unknown): number {
  try {
    return new TextEncoder().encode(JSON.stringify(value ?? {})).length
  } catch {
    return 0
  }
}

function extractText(result: unknown): string {
  if (result && typeof result === 'object' && 'content' in result) {
    const content = (result as { content?: unknown }).content
    if (Array.isArray(content)) {
      return content
        .map((c) =>
          c && typeof c === 'object' && 'text' in c ? String((c as { text: unknown }).text) : ''
        )
        .filter(Boolean)
        .join('\n')
    }
  }
  return ''
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(2)} MB`
}

function tryParseAny(text: string): unknown | undefined {
  const trimmed = text.trim()
  if (!trimmed) return undefined
  if (!/^[\[{"]/.test(trimmed)) return undefined
  try {
    const parsed = JSON.parse(trimmed)
    if (parsed && typeof parsed === 'object') return parsed
    return undefined
  } catch {
    return undefined
  }
}

function tryParseObject(text: string): { ok: true; value: JSONObject } | { ok: false; error: string } {
  if (text.trim() === '') return { ok: true, value: {} }
  try {
    const parsed = JSON.parse(text)
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Expected a JSON object at the top level.' }
    }
    return { ok: true, value: parsed as JSONObject }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

function defaultsFromSchema(schema: unknown): JSONObject {
  if (!schema || typeof schema !== 'object') return {}
  const props = (schema as { properties?: Record<string, { default?: unknown }> }).properties ?? {}
  const out: JSONObject = {}
  for (const [k, v] of Object.entries(props)) {
    if (v && 'default' in v && v.default !== undefined) out[k] = v.default
  }
  return out
}

function exampleFromSchema(schema: unknown): JSONObject | null {
  if (!schema || typeof schema !== 'object') return null
  const examples = (schema as { examples?: unknown[] }).examples
  if (Array.isArray(examples) && examples.length > 0) {
    const first = examples[0]
    if (first && typeof first === 'object' && !Array.isArray(first)) {
      return first as JSONObject
    }
  }
  return null
}

function Playground(): React.JSX.Element {
  const { servers } = useServers()
  const [searchParams, setSearchParams] = useSearchParams()

  const allTools = useMemo<ToolEntry[]>(() => {
    const out: ToolEntry[] = []
    for (const s of servers) {
      if (s.runtime.status !== 'connected') continue
      const disabled = new Set(s.disabledTools)
      for (const t of s.runtime.tools) {
        if (!disabled.has(t.name)) out.push({ server: s, tool: t })
      }
    }
    return out
  }, [servers])

  const [selectedKey, setSelectedKey] = useState<string>('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const selected = allTools.find((e) => `${e.server.id}::${e.tool.name}` === selectedKey)

  // Reset selection if the picked tool disappears (server disconnected, tool toggled off).
  useEffect(() => {
    if (!selected && allTools.length > 0 && !selectedKey) {
      setSelectedKey(`${allTools[0].server.id}::${allTools[0].tool.name}`)
    } else if (selectedKey && !selected) {
      setSelectedKey(allTools[0] ? `${allTools[0].server.id}::${allTools[0].tool.name}` : '')
    }
  }, [allTools, selected, selectedKey])

  // Deep-link from the chat tool-call card: ?serverId=&tool=&args=
  useEffect(() => {
    const sId = searchParams.get('serverId')
    const tName = searchParams.get('tool')
    if (!sId || !tName) return
    const target = allTools.find((e) => e.server.id === sId && e.tool.name === tName)
    if (!target) return
    const key = `${target.server.id}::${target.tool.name}`
    setSelectedKey(key)
    const rawArgs = searchParams.get('args')
    if (rawArgs) {
      try {
        const parsed = JSON.parse(rawArgs)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          skipNextResetRef.current = true
          setArgs(parsed as JSONObject)
          setJsonText(JSON.stringify(parsed, null, 2))
        }
      } catch {
        /* malformed args param — fall back to schema defaults */
      }
    }
    // Clear so a future navigate to /playground keeps user state.
    searchParams.delete('serverId')
    searchParams.delete('tool')
    searchParams.delete('args')
    setSearchParams(searchParams, { replace: true })
  }, [searchParams, allTools, setSearchParams])

  const [args, setArgs] = useState<JSONObject>({})
  const [jsonText, setJsonText] = useState<string>('{}')
  const [editor, setEditor] = useState<'form' | 'json'>('form')
  const skipNextResetRef = useRef(false)
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<RunResult | null>(null)
  const [runError, setRunError] = useState<string | null>(null)

  // When tool selection changes, reset args to defaults — unless a deep-link
  // just supplied custom args, in which case let those stand.
  useEffect(() => {
    if (!selected) return
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false
      setRunResult(null)
      setRunError(null)
      return
    }
    const next = defaultsFromSchema(selected.tool.inputSchema)
    setArgs(next)
    setJsonText(JSON.stringify(next, null, 2))
    setRunResult(null)
    setRunError(null)
  }, [selectedKey])

  // Form → JSON sync (only when form is the active editor).
  useEffect(() => {
    if (editor !== 'form') return
    setJsonText(JSON.stringify(args, null, 2))
  }, [args, editor])

  const jsonParse = useMemo(() => tryParseObject(jsonText), [jsonText])
  const jsonValid = jsonParse.ok

  // JSON → form sync: when valid, push into args.
  useEffect(() => {
    if (editor !== 'json') return
    if (jsonParse.ok) setArgs(jsonParse.value)
  }, [jsonParse, editor])

  const inputValid = editor !== 'json' || jsonValid

  const handleLoadExample = (): void => {
    if (!selected) return
    const ex = exampleFromSchema(selected.tool.inputSchema)
    if (!ex) {
      toast.message('No example provided in schema.')
      return
    }
    setArgs(ex)
    setJsonText(JSON.stringify(ex, null, 2))
  }

  const handleResetDefaults = (): void => {
    if (!selected) return
    const def = defaultsFromSchema(selected.tool.inputSchema)
    setArgs(def)
    setJsonText(JSON.stringify(def, null, 2))
  }

  const handleFormat = (): void => {
    if (!jsonParse.ok) return
    setJsonText(JSON.stringify(jsonParse.value, null, 2))
  }

  const handleRun = useCallback(async (): Promise<void> => {
    if (!selected) return
    if (editor === 'json' && !jsonParse.ok) {
      toast.error('Cannot run with invalid JSON.', { description: jsonParse.error })
      return
    }
    const payload = editor === 'json' && jsonParse.ok ? jsonParse.value : args
    setRunning(true)
    setRunError(null)
    const inputBytes = bytesOf(payload)
    try {
      const { result, latencyMs } = await window.api.mcp.callTool(
        selected.server.id,
        selected.tool.name,
        payload
      )
      const outputBytes = bytesOf(result)
      setRunResult({ result, latencyMs, inputBytes, outputBytes })
    } catch (err) {
      setRunResult(null)
      setRunError(err instanceof Error ? err.message : String(err))
    } finally {
      setRunning(false)
    }
  }, [selected, args, editor, jsonParse])

  // Expose run state to the app header so the Run button lives in the title-bar area.
  useEffect(() => {
    setPlaygroundActions({
      canRun: !!selected && inputValid,
      running,
      run: handleRun
    })
    return clearPlaygroundActions
  }, [selected, inputValid, running, handleRun])

  const [copied, setCopied] = useState(false)
  const handleCopyOutput = async (): Promise<void> => {
    if (!runResult) return
    try {
      await navigator.clipboard.writeText(JSON.stringify(runResult.result, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  if (allTools.length === 0) {
    return (
      <div className="px-6 py-12">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Beaker />
            </EmptyMedia>
            <EmptyTitle>No tools available</EmptyTitle>
            <EmptyDescription>
              Connect at least one MCP server to start exercising its tools here.
            </EmptyDescription>
          </EmptyHeader>
          <Button asChild size="sm" variant="outline">
            <Link to="/">
              <PlugZap /> Manage servers
            </Link>
          </Button>
        </Empty>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-4">
      {/* Toolbar: tool picker + meta */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="flex h-9 w-full max-w-md cursor-pointer items-center gap-2 rounded-full border border-input bg-input/30 px-3 text-left text-sm transition-colors hover:bg-input/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <McpLogo className="size-4 shrink-0 text-muted-foreground" />
          {selected ? (
            <span className="flex min-w-0 flex-1 items-center gap-1.5">
              <span className="truncate font-mono">{selected.tool.name}</span>
              <span className="text-muted-foreground/60">·</span>
              <span className="truncate text-xs text-muted-foreground">
                {selected.server.name}
              </span>
            </span>
          ) : (
            <span className="flex-1 text-muted-foreground">Select a tool</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </button>
        <ToolPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          tools={allTools}
          selectedKey={selectedKey}
          onSelect={setSelectedKey}
        />
        {selected ? (
          <p className="line-clamp-2 min-w-0 flex-1 text-xs text-muted-foreground">
            {selected.tool.description ?? (
              <span className="italic">No description provided.</span>
            )}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">
            <Hammer className="mr-1 inline size-3" /> Pick a tool to begin.
          </p>
        )}
        <Badge variant="outline" className="font-mono text-[10px]">
          {allTools.length} {allTools.length === 1 ? 'tool' : 'tools'}
        </Badge>
      </div>

      {/* Two-pane workspace */}
      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-2">
        {/* Arguments pane */}
        <Card className="flex min-h-0 min-w-0 flex-col gap-0 py-0">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 flex-col">
              <CardTitle className="text-sm">Arguments</CardTitle>
              <CardDescription className="text-[11px]">
                Form and JSON stay in sync.
              </CardDescription>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadExample}
                disabled={!selected || !exampleFromSchema(selected.tool.inputSchema)}
                title="Load the first example from the schema"
              >
                <Sparkles /> Example
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDefaults}
                disabled={!selected}
              >
                <Wand2 /> Defaults
              </Button>
            </div>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-1 flex-col p-0">
            {selected ? (
              <Tabs
                value={editor}
                onValueChange={(v) => setEditor(v as 'form' | 'json')}
                className="flex min-h-0 flex-1 flex-col"
              >
                <div className="shrink-0 border-b px-4 py-2">
                  <TabsList>
                    <TabsTrigger value="form">Form</TabsTrigger>
                    <TabsTrigger value="json">JSON</TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent
                  value="form"
                  className="schema-scroll min-h-0 flex-1 overflow-auto px-4 py-4 data-[state=inactive]:hidden"
                  forceMount
                >
                  <SchemaForm
                    schema={selected.tool.inputSchema as never}
                    value={args}
                    onChange={setArgs}
                  />
                </TabsContent>
                <TabsContent
                  value="json"
                  className="flex min-h-0 flex-1 flex-col gap-2 px-4 py-3 data-[state=inactive]:hidden"
                  forceMount
                >
                  <Textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    spellCheck={false}
                    wrap="soft"
                    className={cn(
                      'min-h-0 w-full flex-1 resize-none font-mono text-xs break-all',
                      !jsonValid && 'border-destructive focus-visible:ring-destructive/30'
                    )}
                  />
                  <div className="flex shrink-0 items-center justify-between gap-2">
                    {jsonValid ? (
                      <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-500">
                        <Check className="size-3" /> Valid JSON object
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 truncate text-[11px] text-destructive">
                        <AlertCircle className="size-3 shrink-0" />
                        <span className="truncate">{!jsonParse.ok && jsonParse.error}</span>
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleFormat}
                      disabled={!jsonValid}
                    >
                      Prettify
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>
            ) : (
              <div className="flex flex-1 items-center justify-center px-4 py-8 text-xs text-muted-foreground">
                Select a tool to configure its arguments.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Result pane */}
        <Card className="flex min-h-0 min-w-0 flex-col gap-0 py-0">
          <CardHeader className="flex shrink-0 flex-row items-center justify-between gap-3 border-b px-4 py-3">
            <div className="flex min-w-0 items-center gap-2">
              <CardTitle className="text-sm">Result</CardTitle>
              {runError && (
                <Badge variant="destructive" className="gap-1">
                  <AlertCircle className="size-3" /> Error
                </Badge>
              )}
            </div>
            {runResult && (
              <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                  {runResult.latencyMs}ms
                </Badge>
                <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                  in {formatBytes(runResult.inputBytes)}
                </Badge>
                <Badge variant="secondary" className="h-5 font-mono text-[10px]">
                  out {formatBytes(runResult.outputBytes)}
                </Badge>
                <Badge variant="outline" className="h-5 font-mono text-[10px]">
                  total {formatBytes(runResult.inputBytes + runResult.outputBytes)}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyOutput}
                  className="h-7 gap-1 px-2 text-xs"
                >
                  {copied ? (
                    <Check className="size-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent className="schema-scroll min-h-0 flex-1 overflow-auto p-4">
            {runError ? (
              <pre className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 font-mono text-xs whitespace-pre-wrap break-words text-destructive">
                {runError}
              </pre>
            ) : runResult ? (
              <div className="flex flex-col gap-3">
                {(() => {
                  const text = extractText(runResult.result)
                  if (!text) return null
                  const asJson = tryParseAny(text)
                  if (asJson !== undefined) {
                    return (
                      <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs">
                        <JsonViewer value={asJson} collapsed={false} />
                      </div>
                    )
                  }
                  return (
                    <pre className="rounded-lg border bg-muted/30 p-3 font-mono text-xs whitespace-pre-wrap break-words">
                      {text}
                    </pre>
                  )
                })()}
                <details className="rounded-lg border bg-muted/20">
                  <summary className="cursor-pointer px-3 py-2 text-xs text-muted-foreground hover:text-foreground">
                    Raw result
                  </summary>
                  <div className="px-3 pb-3 font-mono text-[11px]">
                    <JsonViewer value={runResult.result} collapsed={3} />
                  </div>
                </details>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                {selected
                  ? 'Press Run in the title bar to invoke the tool.'
                  : 'No tool selected.'}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Playground
