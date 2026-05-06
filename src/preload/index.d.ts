import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  AddServerInput,
  LogLine,
  ServerView,
  UpdateServerInput
} from '../renderer/src/lib/mcp-types'
import type {
  ListModelsResult,
  Provider,
  ProviderInput,
  TestRequest,
  TestResult,
  UpdateProviderInput
} from '../renderer/src/lib/llm-types'
import type { ChatEvent, SendChatRequest, ServerSummary } from '../renderer/src/lib/chat-types'

interface McpApi {
  list: () => Promise<ServerView[]>
  add: (input: AddServerInput) => Promise<ServerView>
  update: (input: UpdateServerInput) => Promise<ServerView | null>
  remove: (id: string) => Promise<void>
  connect: (id: string) => Promise<ServerView | null>
  disconnect: (id: string) => Promise<void>
  toggleTool: (id: string, toolName: string, disabled: boolean) => Promise<ServerView | null>
  setAllTools: (id: string, disabled: boolean) => Promise<ServerView | null>
  getLogs: (id: string) => Promise<LogLine[]>
  getAllLogs: () => Promise<LogLine[]>
  clearLogs: (id: string) => Promise<void>
  onServerUpdated: (cb: (view: ServerView) => void) => () => void
  onServerRemoved: (cb: (id: string) => void) => () => void
  onServerLog: (cb: (line: LogLine) => void) => () => void
}

interface LlmApi {
  list: () => Promise<Provider[]>
  add: (input: ProviderInput) => Promise<Provider>
  update: (input: UpdateProviderInput) => Promise<Provider>
  remove: (id: string) => Promise<void>
  test: (req: TestRequest) => Promise<TestResult>
  listModels: (req: TestRequest) => Promise<ListModelsResult>
  onProviderUpdated: (cb: (provider: Provider) => void) => () => void
  onProviderRemoved: (cb: (id: string) => void) => () => void
}

interface ChatApi {
  send: (req: SendChatRequest) => Promise<void>
  cancel: (runId: string) => Promise<void>
  serverContext: () => Promise<ServerSummary[]>
  onEvent: (cb: (event: ChatEvent) => void) => () => void
}

interface WindowApi {
  minimize: () => Promise<void>
  maximizeToggle: () => Promise<void>
  close: () => Promise<void>
  isMaximized: () => Promise<boolean>
  onMaximizedChange: (cb: (isMaximized: boolean) => void) => () => void
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: { mcp: McpApi; llm: LlmApi; chat: ChatApi; win: WindowApi }
  }
}
