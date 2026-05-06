import { EventEmitter } from 'node:events'
import { HumanMessage, AIMessage } from '@langchain/core/messages'
import { createReactAgent } from '@langchain/langgraph/prebuilt'
import { ProviderStore } from '../llm/store'
import { buildModel } from './model'
import { gatherTools } from './tools'
import type { ChatEvent, ChatMessage, SendChatRequest, ServerSummary } from './types'

interface RunHandle {
  controller: AbortController
}

export class ChatManager extends EventEmitter {
  private runs = new Map<string, RunHandle>()

  async listServerContext(): Promise<ServerSummary[]> {
    const { summary } = await gatherTools()
    return summary
  }

  cancel(runId: string): void {
    const handle = this.runs.get(runId)
    if (!handle) return
    handle.controller.abort()
    this.runs.delete(runId)
  }

  async send(req: SendChatRequest): Promise<void> {
    const { runId, providerId, messages } = req
    const provider = ProviderStore.list().find((p) => p.id === providerId)
    if (!provider) {
      this.emit('event', {
        type: 'error',
        runId,
        message: 'Provider not found'
      } satisfies ChatEvent)
      return
    }

    const controller = new AbortController()
    this.runs.set(runId, { controller })

    try {
      const model = buildModel(provider)
      const { tools, toolToServer } = await gatherTools()
      const agent = createReactAgent({ llm: model, tools })

      const langchainMessages = messages.map((m: ChatMessage) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content)
      )

      const stream = agent.streamEvents(
        { messages: langchainMessages },
        { version: 'v2', signal: controller.signal }
      )

      for await (const event of stream) {
        if (controller.signal.aborted) break

        if (event.event === 'on_chat_model_stream') {
          const data = event.data as { chunk?: { content?: unknown } }
          const content = data.chunk?.content
          if (typeof content === 'string' && content.length > 0) {
            this.emit('event', {
              type: 'token',
              runId,
              text: content
            } satisfies ChatEvent)
          } else if (Array.isArray(content)) {
            for (const part of content) {
              if (
                part &&
                typeof part === 'object' &&
                'type' in part &&
                part.type === 'text' &&
                'text' in part &&
                typeof part.text === 'string'
              ) {
                this.emit('event', {
                  type: 'token',
                  runId,
                  text: part.text
                } satisfies ChatEvent)
              }
            }
          }
        } else if (event.event === 'on_tool_start') {
          const toolName = event.name
          const data = event.data as { input?: unknown }
          this.emit('event', {
            type: 'tool-start',
            runId,
            toolId: event.run_id,
            toolName,
            serverName: toolToServer.get(toolName),
            args: data.input
          } satisfies ChatEvent)
        } else if (event.event === 'on_tool_end') {
          const toolName = event.name
          const data = event.data as { output?: unknown }
          let outputStr = ''
          let isError = false
          const output = data.output
          if (typeof output === 'string') {
            outputStr = output
          } else if (output && typeof output === 'object') {
            if (
              'content' in output &&
              typeof (output as { content: unknown }).content === 'string'
            ) {
              outputStr = (output as { content: string }).content
            } else {
              outputStr = JSON.stringify(output, null, 2)
            }
            if ('status' in output && (output as { status: unknown }).status === 'error') {
              isError = true
            }
          }
          this.emit('event', {
            type: 'tool-end',
            runId,
            toolId: event.run_id,
            toolName,
            serverName: toolToServer.get(toolName),
            output: outputStr,
            isError
          } satisfies ChatEvent)
        }
      }

      this.emit('event', { type: 'done', runId } satisfies ChatEvent)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      this.emit('event', { type: 'error', runId, message } satisfies ChatEvent)
    } finally {
      this.runs.delete(runId)
    }
  }
}

export const chatManager = new ChatManager()
