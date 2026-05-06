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

export type AssistantPart =
  | { kind: 'text'; text: string }
  | {
      kind: 'tool'
      toolId: string
      toolName: string
      serverName?: string
      args?: unknown
      output?: string
      isError?: boolean
      status: 'running' | 'done' | 'error'
    }

export interface DisplayMessage {
  id: string
  role: 'user' | 'assistant'
  parts: AssistantPart[]
  done?: boolean
  error?: string
}
