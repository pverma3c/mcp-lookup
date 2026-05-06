export const CHAT_CHANNELS = {
  send: 'chat:send',
  cancel: 'chat:cancel',
  serverContext: 'chat:server-context',
  event: 'chat:event'
} as const

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface SendChatRequest {
  runId: string
  providerId: string
  messages: ChatMessage[]
}

export interface ServerSummary {
  id: string
  name: string
  toolCount: number
}

export type ChatEvent =
  | { type: 'token'; runId: string; text: string }
  | {
      type: 'tool-start'
      runId: string
      toolId: string
      toolName: string
      serverName?: string
      args: unknown
    }
  | {
      type: 'tool-end'
      runId: string
      toolId: string
      toolName: string
      serverName?: string
      output: string
      isError?: boolean
    }
  | { type: 'message'; runId: string; content: string }
  | { type: 'done'; runId: string }
  | { type: 'error'; runId: string; message: string }
