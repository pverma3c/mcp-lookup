import { useEffect, useRef, useState } from 'react'
import { Globe, Plus, Radio, Terminal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { ServerView, Transport, TransportConfig } from '@/lib/mcp-types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: ServerView
}

interface KV {
  key: string
  value: string
}

type StdioMode = 'npx' | 'custom'

interface DraftState {
  name: string
  transport: Transport
  stdioMode: StdioMode
  npxUrl: string
  npxAllowHttp: boolean
  npxDebug: boolean
  npxSkipTls: boolean
  command: string
  argsText: string
  cwd: string
  envList: KV[]
  url: string
  headerList: KV[]
}

const DRAFT_PREFIX = 'mcp-lookup:draft:'

const EMPTY_DRAFT: DraftState = {
  name: '',
  transport: 'stdio',
  stdioMode: 'npx',
  npxUrl: '',
  npxAllowHttp: false,
  npxDebug: false,
  npxSkipTls: false,
  command: '',
  argsText: '',
  cwd: '',
  envList: [],
  url: '',
  headerList: []
}

interface NpxParse {
  url: string
  allowHttp: boolean
  debug: boolean
  matched: boolean
}

function parseNpxArgs(args: string[]): NpxParse {
  // Expect: -y mcp-remote@<ver> <url> [--allow-http] [--debug]
  if (args.length < 3) return { url: '', allowHttp: false, debug: false, matched: false }
  if (args[0] !== '-y') return { url: '', allowHttp: false, debug: false, matched: false }
  if (!/^mcp-remote(@.+)?$/.test(args[1])) {
    return { url: '', allowHttp: false, debug: false, matched: false }
  }
  const url = args[2]
  const rest = args.slice(3)
  const allowHttp = rest.includes('--allow-http')
  const debug = rest.includes('--debug')
  return { url, allowHttp, debug, matched: true }
}

function envToList(env: Record<string, string>): KV[] {
  return Object.entries(env).map(([key, value]) => ({ key, value }))
}

function listToEnv(list: KV[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const { key, value } of list) {
    if (key.trim()) out[key.trim()] = value
  }
  return out
}

function parseArgs(input: string): string[] {
  return input
    .split(/\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function seedFromEditing(editing: ServerView | undefined): DraftState {
  if (!editing) return EMPTY_DRAFT
  if (editing.config.transport === 'stdio') {
    const env = editing.config.env
    const skipTls = env['NODE_TLS_REJECT_UNAUTHORIZED'] === '0'
    const restEnv = { ...env }
    if (skipTls) delete restEnv['NODE_TLS_REJECT_UNAUTHORIZED']
    const npx = editing.config.command === 'npx' ? parseNpxArgs(editing.config.args) : null
    if (npx?.matched) {
      return {
        ...EMPTY_DRAFT,
        name: editing.name,
        transport: 'stdio',
        stdioMode: 'npx',
        npxUrl: npx.url,
        npxAllowHttp: npx.allowHttp,
        npxDebug: npx.debug,
        npxSkipTls: skipTls,
        envList: envToList(restEnv),
        cwd: editing.config.cwd ?? ''
      }
    }
    return {
      ...EMPTY_DRAFT,
      name: editing.name,
      transport: 'stdio',
      stdioMode: 'custom',
      command: editing.config.command,
      argsText: editing.config.args.join(' '),
      cwd: editing.config.cwd ?? '',
      envList: envToList(editing.config.env)
    }
  }
  return {
    ...EMPTY_DRAFT,
    name: editing.name,
    transport: editing.config.transport,
    url: editing.config.url,
    headerList: envToList(editing.config.headers)
  }
}

function loadDraft(key: string): DraftState | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<DraftState>
    return { ...EMPTY_DRAFT, ...parsed }
  } catch {
    return null
  }
}

export function AddServerDialog({ open, onOpenChange, editing }: Props): React.JSX.Element {
  const [state, setState] = useState<DraftState>(EMPTY_DRAFT)
  const [restored, setRestored] = useState(false)
  const draftKey = DRAFT_PREFIX + (editing?.id ?? 'new')
  const initializedFor = useRef<string | null>(null)

  useEffect(() => {
    if (!open) {
      initializedFor.current = null
      return
    }
    if (initializedFor.current === draftKey) return
    initializedFor.current = draftKey

    const draft = loadDraft(draftKey)
    if (draft) {
      setState(draft)
      setRestored(true)
    } else {
      setState(seedFromEditing(editing))
      setRestored(false)
    }
  }, [open, draftKey, editing])

  useEffect(() => {
    if (!open || initializedFor.current !== draftKey) return
    try {
      localStorage.setItem(draftKey, JSON.stringify(state))
    } catch {
      /* quota exceeded — ignore */
    }
  }, [state, open, draftKey])

  const update = <K extends keyof DraftState>(key: K, value: DraftState[K]): void => {
    setState((prev) => ({ ...prev, [key]: value }))
  }

  const discardDraft = (): void => {
    localStorage.removeItem(draftKey)
    setState(seedFromEditing(editing))
    setRestored(false)
  }

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!state.name.trim()) {
      toast.error('Name is required')
      return
    }
    let config: TransportConfig
    if (state.transport === 'stdio') {
      if (state.stdioMode === 'npx') {
        if (!state.npxUrl.trim()) {
          toast.error('URL is required')
          return
        }
        try {
          new URL(state.npxUrl.trim())
        } catch {
          toast.error('URL is invalid')
          return
        }
        const args = ['-y', 'mcp-remote@latest', state.npxUrl.trim()]
        if (state.npxAllowHttp) args.push('--allow-http')
        if (state.npxDebug) args.push('--debug')
        const env = listToEnv(state.envList)
        if (state.npxSkipTls) env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0'
        config = {
          transport: 'stdio',
          command: 'npx',
          args,
          env,
          cwd: state.cwd.trim() || undefined
        }
      } else {
        if (!state.command.trim()) {
          toast.error('Command is required')
          return
        }
        config = {
          transport: 'stdio',
          command: state.command.trim(),
          args: parseArgs(state.argsText),
          env: listToEnv(state.envList),
          cwd: state.cwd.trim() || undefined
        }
      }
    } else {
      if (!state.url.trim()) {
        toast.error('URL is required')
        return
      }
      try {
        new URL(state.url.trim())
      } catch {
        toast.error('URL is invalid')
        return
      }
      config = {
        transport: state.transport,
        url: state.url.trim(),
        headers: listToEnv(state.headerList)
      }
    }

    try {
      if (editing) {
        await window.api.mcp.update({ id: editing.id, name: state.name.trim(), config })
        toast.success('Server updated')
      } else {
        await window.api.mcp.add({ name: state.name.trim(), config })
        toast.success('Server added')
      }
      localStorage.removeItem(draftKey)
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogHeader className="border-b px-6 py-4">
            <div className="flex items-center gap-2">
              <DialogTitle>{editing ? 'Edit MCP server' : 'Add MCP server'}</DialogTitle>
              {restored && (
                <Badge variant="secondary" className="font-normal">
                  Draft restored
                </Badge>
              )}
            </div>
            <DialogDescription>
              Configure how MCP-Lookup connects to this server. Connect later from its card.
            </DialogDescription>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="server-name">Name</FieldLabel>
                <Input
                  id="server-name"
                  placeholder="e.g. Filesystem"
                  value={state.name}
                  onChange={(e) => update('name', e.target.value)}
                  autoFocus
                />
              </Field>

              <Field>
                <FieldLabel>Transport</FieldLabel>
                <Tabs
                  value={state.transport}
                  onValueChange={(v) => update('transport', v as Transport)}
                >
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="stdio">
                      <Terminal />
                      Stdio
                    </TabsTrigger>
                    <TabsTrigger value="http">
                      <Globe />
                      HTTP
                    </TabsTrigger>
                    <TabsTrigger value="sse">
                      <Radio />
                      SSE
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="stdio" className="mt-5">
                    <Tabs
                      value={state.stdioMode}
                      onValueChange={(v) => update('stdioMode', v as StdioMode)}
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="npx">npx mcp-remote</TabsTrigger>
                        <TabsTrigger value="custom">Custom</TabsTrigger>
                      </TabsList>

                      <TabsContent value="npx" className="mt-4">
                        <FieldGroup>
                          <Field>
                            <FieldLabel htmlFor="npx-url">URL</FieldLabel>
                            <Input
                              id="npx-url"
                              placeholder="https://example.com/mcp"
                              value={state.npxUrl}
                              onChange={(e) => update('npxUrl', e.target.value)}
                            />
                            <FieldDescription>
                              Bridges the remote MCP endpoint over stdio with OAuth handled by
                              <code className="mx-1">mcp-remote</code>.
                            </FieldDescription>
                          </Field>

                          <Field>
                            <FieldLabel>Flags</FieldLabel>
                            <div className="flex flex-col gap-2.5 rounded-md border px-3 py-2.5">
                              <label className="flex items-start gap-2.5 text-sm">
                                <Checkbox
                                  id="npx-allow-http"
                                  checked={state.npxAllowHttp}
                                  onCheckedChange={(v) => update('npxAllowHttp', v === true)}
                                  className="mt-0.5"
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono">--allow-http</span>
                                  <span className="text-xs text-muted-foreground">
                                    Permit non-HTTPS endpoints (local dev).
                                  </span>
                                </div>
                              </label>
                              <label className="flex items-start gap-2.5 text-sm">
                                <Checkbox
                                  id="npx-debug"
                                  checked={state.npxDebug}
                                  onCheckedChange={(v) => update('npxDebug', v === true)}
                                  className="mt-0.5"
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono">--debug</span>
                                  <span className="text-xs text-muted-foreground">
                                    Verbose logging from mcp-remote (visible in Output).
                                  </span>
                                </div>
                              </label>
                              <label className="flex items-start gap-2.5 text-sm">
                                <Checkbox
                                  id="npx-skip-tls"
                                  checked={state.npxSkipTls}
                                  onCheckedChange={(v) => update('npxSkipTls', v === true)}
                                  className="mt-0.5"
                                />
                                <div className="flex flex-col">
                                  <span className="font-mono">
                                    NODE_TLS_REJECT_UNAUTHORIZED=0
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Skip TLS cert verification. Sets the env var on the spawned
                                    process.
                                  </span>
                                </div>
                              </label>
                            </div>
                          </Field>

                          <CommandPreview
                            command="npx"
                            args={[
                              '-y',
                              'mcp-remote@latest',
                              state.npxUrl,
                              state.npxAllowHttp ? '--allow-http' : '',
                              state.npxDebug ? '--debug' : ''
                            ]
                              .filter(Boolean)
                              .join(' ')}
                          />

                          <KeyValueSection
                            label="Additional environment variables"
                            emptyHint="No extra environment variables."
                            keyPlaceholder="KEY"
                            valuePlaceholder="value"
                            rows={state.envList}
                            onChange={(rows) => update('envList', rows)}
                          />
                        </FieldGroup>
                      </TabsContent>

                      <TabsContent value="custom" className="mt-4">
                        <FieldGroup>
                          <Field>
                            <FieldLabel htmlFor="cmd">Command</FieldLabel>
                            <Input
                              id="cmd"
                              placeholder="npx"
                              value={state.command}
                              onChange={(e) => update('command', e.target.value)}
                            />
                            <FieldDescription>
                              Executable to spawn. Common: <code>npx</code>, <code>uvx</code>,{' '}
                              <code>node</code>, <code>python</code>.
                            </FieldDescription>
                          </Field>
                          <Field>
                            <FieldLabel htmlFor="args">Arguments</FieldLabel>
                            <Input
                              id="args"
                              placeholder="-y @modelcontextprotocol/server-everything"
                              value={state.argsText}
                              onChange={(e) => update('argsText', e.target.value)}
                            />
                            <FieldDescription>Space-separated.</FieldDescription>
                          </Field>

                          <CommandPreview command={state.command} args={state.argsText} />

                          <Field>
                            <FieldLabel htmlFor="cwd">
                              Working directory{' '}
                              <span className="text-muted-foreground">(optional)</span>
                            </FieldLabel>
                            <Input
                              id="cwd"
                              placeholder="/path/to/project"
                              value={state.cwd}
                              onChange={(e) => update('cwd', e.target.value)}
                            />
                          </Field>

                          <KeyValueSection
                            label="Environment variables"
                            emptyHint="No environment variables. Process inherits the app's env."
                            keyPlaceholder="KEY"
                            valuePlaceholder="value"
                            rows={state.envList}
                            onChange={(rows) => update('envList', rows)}
                          />
                        </FieldGroup>
                      </TabsContent>
                    </Tabs>
                  </TabsContent>

                  <TabsContent value="http" className="mt-5">
                    <UrlFields
                      url={state.url}
                      setUrl={(v) => update('url', v)}
                      headers={state.headerList}
                      setHeaders={(rows) => update('headerList', rows)}
                      hint="Streamable HTTP endpoint. Falls back to SSE automatically."
                    />
                  </TabsContent>

                  <TabsContent value="sse" className="mt-5">
                    <UrlFields
                      url={state.url}
                      setUrl={(v) => update('url', v)}
                      headers={state.headerList}
                      setHeaders={(rows) => update('headerList', rows)}
                      hint="Server-Sent Events endpoint."
                    />
                  </TabsContent>
                </Tabs>
              </Field>
            </FieldGroup>
          </div>

          <DialogFooter className="flex-row items-center justify-between border-t px-6 py-4">
            <div>
              {restored && (
                <Button type="button" variant="ghost" size="sm" onClick={discardDraft}>
                  Discard draft
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit">{editing ? 'Save changes' : 'Add server'}</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function CommandPreview({ command, args }: { command: string; args: string }): React.JSX.Element {
  const cmd = command.trim()
  const argsTrim = args.trim()
  const hasContent = cmd.length > 0 || argsTrim.length > 0
  return (
    <div className="rounded-md border bg-muted/40 px-3 py-2.5 font-mono text-xs leading-relaxed">
      <span className="select-none text-muted-foreground">$ </span>
      {hasContent ? (
        <span className="break-all">
          {cmd}
          {argsTrim ? ' ' + argsTrim : ''}
        </span>
      ) : (
        <span className="text-muted-foreground/60">your command will appear here</span>
      )}
    </div>
  )
}

function UrlFields({
  url,
  setUrl,
  headers,
  setHeaders,
  hint
}: {
  url: string
  setUrl: (v: string) => void
  headers: KV[]
  setHeaders: (rows: KV[]) => void
  hint: string
}): React.JSX.Element {
  return (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor="url">URL</FieldLabel>
        <Input
          id="url"
          placeholder="https://example.com/mcp"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <FieldDescription>{hint}</FieldDescription>
      </Field>
      <KeyValueSection
        label="Headers"
        emptyHint="No headers. Add Authorization, X-API-Key, etc."
        keyPlaceholder="Header"
        valuePlaceholder="value"
        rows={headers}
        onChange={setHeaders}
      />
    </FieldGroup>
  )
}

function KeyValueSection({
  label,
  emptyHint,
  keyPlaceholder,
  valuePlaceholder,
  rows,
  onChange
}: {
  label: string
  emptyHint: string
  keyPlaceholder: string
  valuePlaceholder: string
  rows: KV[]
  onChange: (rows: KV[]) => void
}): React.JSX.Element {
  const update = (i: number, patch: Partial<KV>): void => {
    const next = [...rows]
    next[i] = { ...next[i], ...patch }
    onChange(next)
  }
  const remove = (i: number): void => onChange(rows.filter((_, j) => j !== i))
  const add = (): void => onChange([...rows, { key: '', value: '' }])

  return (
    <Field>
      <div className="flex items-center justify-between">
        <FieldLabel>{label}</FieldLabel>
        <Button type="button" variant="ghost" size="sm" onClick={add}>
          <Plus />
          Add
        </Button>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-dashed px-3 py-3 text-center text-xs text-muted-foreground">
          {emptyHint}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)_auto] items-center gap-2"
            >
              <Input
                placeholder={keyPlaceholder}
                value={row.key}
                onChange={(e) => update(i, { key: e.target.value })}
                className="font-mono text-xs"
              />
              <Input
                placeholder={valuePlaceholder}
                value={row.value}
                onChange={(e) => update(i, { value: e.target.value })}
                className="font-mono text-xs"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(i)}
                aria-label="Remove"
              >
                <Trash2 />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Field>
  )
}
