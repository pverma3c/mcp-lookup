export type Transport = 'stdio' | 'http' | 'sse'

export interface StdioConfig {
  transport: 'stdio'
  command: string
  args: string[]
  env: Record<string, string>
  cwd?: string
}

export interface HttpConfig {
  transport: 'http' | 'sse'
  url: string
  headers: Record<string, string>
}

export type TransportConfig = StdioConfig | HttpConfig

export interface ServerConfig {
  id: string
  name: string
  config: TransportConfig
  disabledTools: string[]
  autoConnect?: boolean
}

export interface ToolInfo {
  name: string
  description?: string
  inputSchema: unknown
}

export interface PromptInfo {
  name: string
  description?: string
  arguments?: Array<{ name: string; description?: string; required?: boolean }>
}

export interface ResourceInfo {
  uri: string
  name?: string
  description?: string
  mimeType?: string
}

export interface Capabilities {
  tools: boolean
  prompts: boolean
  resources: boolean
}

export type ServerStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

export interface ServerRuntime {
  id: string
  status: ServerStatus
  error?: string
  capabilities: Capabilities
  tools: ToolInfo[]
  prompts: PromptInfo[]
  resources: ResourceInfo[]
}

export interface ServerView extends ServerConfig {
  runtime: ServerRuntime
}

export const MCP_CHANNELS = {
  list: 'mcp:list',
  add: 'mcp:add',
  update: 'mcp:update',
  remove: 'mcp:remove',
  connect: 'mcp:connect',
  disconnect: 'mcp:disconnect',
  toggleTool: 'mcp:toggle-tool',
  setAllTools: 'mcp:set-all-tools',
  getLogs: 'mcp:get-logs',
  getAllLogs: 'mcp:get-all-logs',
  clearLogs: 'mcp:clear-logs',
  serverUpdated: 'mcp:server-updated',
  serverRemoved: 'mcp:server-removed',
  serverLog: 'mcp:server-log'
} as const

export type LogSource = 'system' | 'stderr' | 'backend'

export type LogLevel = 'log' | 'info' | 'warn' | 'error'

export interface LogLine {
  serverId: string
  source: LogSource
  message: string
  timestamp: number
  level?: LogLevel
}

export type AddServerInput = Omit<ServerConfig, 'id' | 'disabledTools'>
export type UpdateServerInput = Pick<ServerConfig, 'id' | 'name' | 'config'>
