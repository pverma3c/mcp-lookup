import { EventEmitter } from 'node:events'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { nanoid } from 'nanoid'
import { ServerStore } from './store'
import { buildSpawnEnv, preflightNodeCommand } from './runtime-env'
import type {
  AddServerInput,
  Capabilities,
  LogLine,
  LogSource,
  ServerConfig,
  ServerRuntime,
  ServerStatus,
  ServerView,
  UpdateServerInput
} from './types'

const MAX_LOG_LINES = 500

interface Connection {
  client: Client
}

interface PendingConnect {
  transport: InstanceType<
    | typeof StdioClientTransport
    | typeof StreamableHTTPClientTransport
    | typeof SSEClientTransport
  >
  cancelled: boolean
}

const APP_INFO = { name: 'mcp-lookup', version: '1.0.0' }

function emptyRuntime(id: string): ServerRuntime {
  return {
    id,
    status: 'disconnected',
    capabilities: { tools: false, prompts: false, resources: false },
    tools: [],
    prompts: [],
    resources: []
  }
}

export class McpManager extends EventEmitter {
  private connections = new Map<string, Connection>()
  private pending = new Map<string, PendingConnect>()
  private runtimes = new Map<string, ServerRuntime>()
  private logs = new Map<string, LogLine[]>()

  constructor() {
    super()
    for (const cfg of ServerStore.list()) {
      this.runtimes.set(cfg.id, emptyRuntime(cfg.id))
    }
  }

  getLogs(id: string): LogLine[] {
    return this.logs.get(id) ?? []
  }

  getAllLogs(): LogLine[] {
    const all: LogLine[] = []
    for (const lines of this.logs.values()) {
      for (const line of lines) all.push(line)
    }
    return all
  }

  clearLogs(id: string): void {
    this.logs.set(id, [])
  }

  private appendLog(id: string, source: LogSource, message: string): void {
    const trimmed = message.trim()
    if (!trimmed) return
    const lines = this.logs.get(id) ?? []
    for (const part of trimmed.split(/\r?\n/)) {
      if (!part) continue
      const line: LogLine = { serverId: id, source, message: part, timestamp: Date.now() }
      lines.push(line)
      this.emit('log', line)
    }
    while (lines.length > MAX_LOG_LINES) lines.shift()
    this.logs.set(id, lines)
  }

  list(): ServerView[] {
    return ServerStore.list().map((cfg) => ({
      ...cfg,
      runtime: this.runtimes.get(cfg.id) ?? emptyRuntime(cfg.id)
    }))
  }

  getConnected(): Array<{ config: ServerConfig; client: Client }> {
    const out: Array<{ config: ServerConfig; client: Client }> = []
    for (const [id, conn] of this.connections) {
      const cfg = ServerStore.get(id)
      if (cfg) out.push({ config: cfg, client: conn.client })
    }
    return out
  }

  add(input: AddServerInput): ServerView {
    const server: ServerConfig = {
      id: nanoid(10),
      name: input.name,
      config: input.config,
      disabledTools: []
    }
    ServerStore.upsert(server)
    this.runtimes.set(server.id, emptyRuntime(server.id))
    const view = this.viewOf(server)
    this.emit('updated', view)
    return view
  }

  update(input: UpdateServerInput): ServerView | null {
    const existing = ServerStore.get(input.id)
    if (!existing) return null
    const next: ServerConfig = { ...existing, name: input.name, config: input.config }
    ServerStore.upsert(next)
    const view = this.viewOf(next)
    this.emit('updated', view)
    return view
  }

  async remove(id: string): Promise<void> {
    await this.disconnect(id).catch(() => {})
    ServerStore.remove(id)
    this.runtimes.delete(id)
    this.emit('removed', id)
  }

  async connect(id: string): Promise<ServerView | null> {
    const cfg = ServerStore.get(id)
    if (!cfg) return null
    if (this.connections.has(id)) return this.viewOf(cfg)
    if (this.pending.has(id)) return this.viewOf(cfg)

    this.setStatus(id, 'connecting')
    this.appendLog(id, 'system', this.describeConnect(cfg))
    let pending: PendingConnect | null = null
    try {
      const transport = this.buildTransport(cfg)
      pending = { transport, cancelled: false }
      this.pending.set(id, pending)
      if (cfg.config.transport === 'stdio' && transport instanceof StdioClientTransport) {
        const stderr = transport.stderr
        if (stderr) {
          stderr.on('data', (chunk: Buffer | string) => {
            this.appendLog(id, 'stderr', chunk.toString())
          })
        }
      }
      const client = new Client(APP_INFO, { capabilities: {} })
      await client.connect(transport)
      if (pending.cancelled) {
        try {
          await client.close()
        } catch {
          /* ignore */
        }
        throw new Error('__cancelled__')
      }
      this.pending.delete(id)
      this.connections.set(id, { client })
      this.appendLog(id, 'system', 'Connected.')

      const caps = client.getServerCapabilities() ?? {}
      const capabilities: Capabilities = {
        tools: !!caps.tools,
        prompts: !!caps.prompts,
        resources: !!caps.resources
      }

      const [toolsRes, promptsRes, resourcesRes] = await Promise.all([
        capabilities.tools ? client.listTools() : Promise.resolve({ tools: [] }),
        capabilities.prompts ? client.listPrompts() : Promise.resolve({ prompts: [] }),
        capabilities.resources ? client.listResources() : Promise.resolve({ resources: [] })
      ])

      const runtime: ServerRuntime = {
        id,
        status: 'connected',
        capabilities,
        tools: toolsRes.tools.map((t) => ({
          name: t.name,
          description: t.description,
          inputSchema: t.inputSchema
        })),
        prompts: promptsRes.prompts.map((p) => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments
        })),
        resources: resourcesRes.resources.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType
        }))
      }
      this.runtimes.set(id, runtime)

      client.onclose = () => {
        if (this.connections.get(id)?.client === client) {
          this.connections.delete(id)
          this.appendLog(id, 'system', 'Connection closed.')
          this.setStatus(id, 'disconnected')
        }
      }

      const updated: ServerConfig = { ...cfg, autoConnect: true }
      ServerStore.upsert(updated)
      const view = this.viewOf(updated)
      this.emit('updated', view)
      return view
    } catch (err) {
      const wasCancelled = pending?.cancelled === true
      this.pending.delete(id)
      this.connections.delete(id)
      if (wasCancelled) {
        this.appendLog(id, 'system', 'Connect cancelled.')
        this.runtimes.set(id, emptyRuntime(id))
        this.emit('updated', this.viewOf(cfg))
        return this.viewOf(cfg)
      }
      const message = err instanceof Error ? err.message : String(err)
      this.appendLog(id, 'system', `Failed to connect: ${message}`)
      const cause = (err as { cause?: unknown }).cause
      if (cause instanceof Error) {
        this.appendLog(id, 'system', `Cause: ${cause.message}`)
      } else if (cause) {
        this.appendLog(id, 'system', `Cause: ${String(cause)}`)
      }
      if (err instanceof Error && err.stack) {
        const trimmed = err.stack.split('\n').slice(0, 4).join('\n')
        this.appendLog(id, 'system', trimmed)
      }
      this.runtimes.set(id, { ...emptyRuntime(id), status: 'error', error: message })
      this.emit('updated', this.viewOf(cfg))
      return this.viewOf(cfg)
    }
  }

  async cancelConnect(id: string): Promise<void> {
    const pending = this.pending.get(id)
    if (!pending) return
    pending.cancelled = true
    try {
      await pending.transport.close()
    } catch {
      /* ignore */
    }
  }

  async callTool(
    serverId: string,
    toolName: string,
    args: Record<string, unknown>
  ): Promise<{ result: unknown; latencyMs: number }> {
    const conn = this.connections.get(serverId)
    if (!conn) throw new Error('Server is not connected')
    const start = Date.now()
    const result = await conn.client.callTool({ name: toolName, arguments: args })
    return { result, latencyMs: Date.now() - start }
  }

  private describeConnect(cfg: ServerConfig): string {
    const c = cfg.config
    if (c.transport === 'stdio') {
      return `Spawning: ${c.command} ${c.args.join(' ')}`.trim()
    }
    return `Connecting to ${c.transport.toUpperCase()} ${c.url}`
  }

  async disconnect(id: string): Promise<void> {
    const conn = this.connections.get(id)
    this.connections.delete(id)
    if (conn) {
      this.appendLog(id, 'system', 'Disconnecting…')
      try {
        await conn.client.close()
      } catch {
        /* ignore */
      }
    }
    this.runtimes.set(id, emptyRuntime(id))
    const cfg = ServerStore.get(id)
    if (cfg) {
      const updated: ServerConfig = { ...cfg, autoConnect: false }
      ServerStore.upsert(updated)
      this.emit('updated', this.viewOf(updated))
    }
  }

  async restoreConnections(): Promise<void> {
    const targets = ServerStore.list().filter((cfg) => cfg.autoConnect === true)
    if (targets.length === 0) return
    await Promise.all(
      targets.map((cfg) =>
        this.connect(cfg.id).catch(() => {
          /* errors already surfaced via logs/runtime status */
        })
      )
    )
  }

  toggleTool(id: string, toolName: string, disabled: boolean): ServerView | null {
    const cfg = ServerStore.get(id)
    if (!cfg) return null
    const set = new Set(cfg.disabledTools)
    if (disabled) set.add(toolName)
    else set.delete(toolName)
    const next: ServerConfig = { ...cfg, disabledTools: [...set] }
    ServerStore.upsert(next)
    const view = this.viewOf(next)
    this.emit('updated', view)
    return view
  }

  setAllTools(id: string, disabled: boolean): ServerView | null {
    const cfg = ServerStore.get(id)
    if (!cfg) return null
    const runtime = this.runtimes.get(id)
    const allNames = runtime?.tools.map((t) => t.name) ?? []
    const next: ServerConfig = {
      ...cfg,
      disabledTools: disabled ? allNames : []
    }
    ServerStore.upsert(next)
    const view = this.viewOf(next)
    this.emit('updated', view)
    return view
  }

  private buildTransport(cfg: ServerConfig): InstanceType<
    | typeof StdioClientTransport
    | typeof StreamableHTTPClientTransport
    | typeof SSEClientTransport
  > {
    const c = cfg.config
    if (c.transport === 'stdio') {
      const env = buildSpawnEnv(c.env ?? {})
      const preflightError = preflightNodeCommand(c.command, env)
      if (preflightError) throw new Error(preflightError)
      return new StdioClientTransport({
        command: c.command,
        args: c.args,
        env,
        cwd: c.cwd && c.cwd.trim() ? c.cwd : undefined,
        stderr: 'pipe'
      })
    }
    const url = new URL(c.url)
    const init: RequestInit = { headers: c.headers }
    if (c.transport === 'sse') {
      return new SSEClientTransport(url, { requestInit: init })
    }
    return new StreamableHTTPClientTransport(url, { requestInit: init })
  }

  private setStatus(id: string, status: ServerStatus): void {
    const prev = this.runtimes.get(id) ?? emptyRuntime(id)
    this.runtimes.set(id, { ...prev, status, error: status === 'error' ? prev.error : undefined })
    const cfg = ServerStore.get(id)
    if (cfg) this.emit('updated', this.viewOf(cfg))
  }

  private viewOf(cfg: ServerConfig): ServerView {
    return { ...cfg, runtime: this.runtimes.get(cfg.id) ?? emptyRuntime(cfg.id) }
  }
}

export const mcpManager = new McpManager()
