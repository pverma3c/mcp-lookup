import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  AssistantPart,
  ChatEvent,
  ChatMessage,
  DisplayMessage
} from '@/lib/chat-types'

function newId(): string {
  return Math.random().toString(36).slice(2, 11)
}

function messagesForApi(displayed: DisplayMessage[]): ChatMessage[] {
  return displayed.map((m) => ({
    role: m.role,
    content:
      m.role === 'user'
        ? (m.parts[0] as { kind: 'text'; text: string })?.text ?? ''
        : m.parts
            .filter((p): p is Extract<AssistantPart, { kind: 'text' }> => p.kind === 'text')
            .map((p) => p.text)
            .join('')
  }))
}

export function useChat(): {
  messages: DisplayMessage[]
  running: boolean
  send: (providerId: string, text: string) => void
  cancel: () => void
  clear: () => void
} {
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [running, setRunning] = useState(false)
  const runIdRef = useRef<string | null>(null)
  const assistantIdRef = useRef<string | null>(null)

  const updateAssistant = useCallback(
    (mut: (m: DisplayMessage) => DisplayMessage): void => {
      const id = assistantIdRef.current
      if (!id) return
      setMessages((prev) => prev.map((m) => (m.id === id ? mut(m) : m)))
    },
    []
  )

  useEffect(() => {
    const off = window.api.chat.onEvent((raw: ChatEvent) => {
      if (raw.runId !== runIdRef.current) return

      if (raw.type === 'token') {
        updateAssistant((m) => {
          const parts = [...m.parts]
          const last = parts[parts.length - 1]
          if (last && last.kind === 'text') {
            parts[parts.length - 1] = { ...last, text: last.text + raw.text }
          } else {
            parts.push({ kind: 'text', text: raw.text })
          }
          return { ...m, parts }
        })
      } else if (raw.type === 'tool-start') {
        updateAssistant((m) => ({
          ...m,
          parts: [
            ...m.parts,
            {
              kind: 'tool',
              toolId: raw.toolId,
              toolName: raw.toolName,
              serverName: raw.serverName,
              args: raw.args,
              status: 'running'
            }
          ]
        }))
      } else if (raw.type === 'tool-end') {
        updateAssistant((m) => ({
          ...m,
          parts: m.parts.map((p) =>
            p.kind === 'tool' && p.toolId === raw.toolId
              ? {
                  ...p,
                  output: raw.output,
                  isError: raw.isError,
                  status: raw.isError ? 'error' : 'done'
                }
              : p
          )
        }))
      } else if (raw.type === 'done') {
        setRunning(false)
        runIdRef.current = null
        updateAssistant((m) => ({ ...m, done: true }))
      } else if (raw.type === 'error') {
        setRunning(false)
        runIdRef.current = null
        updateAssistant((m) => ({ ...m, done: true, error: raw.message }))
      }
    })
    return off
  }, [updateAssistant])

  const send = useCallback(
    (providerId: string, text: string) => {
      const trimmed = text.trim()
      if (!trimmed || running) return

      const userMsg: DisplayMessage = {
        id: newId(),
        role: 'user',
        parts: [{ kind: 'text', text: trimmed }]
      }
      const assistantMsg: DisplayMessage = {
        id: newId(),
        role: 'assistant',
        parts: []
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg])
      assistantIdRef.current = assistantMsg.id

      const runId = newId()
      runIdRef.current = runId
      setRunning(true)

      void window.api.chat.send({
        runId,
        providerId,
        messages: messagesForApi([...messages, userMsg])
      })
    },
    [messages, running]
  )

  const cancel = useCallback((): void => {
    if (!runIdRef.current) return
    void window.api.chat.cancel(runIdRef.current)
    setRunning(false)
    runIdRef.current = null
    updateAssistant((m) => ({ ...m, done: true }))
  }, [updateAssistant])

  const clear = useCallback((): void => {
    if (running && runIdRef.current) {
      void window.api.chat.cancel(runIdRef.current)
    }
    setMessages([])
    setRunning(false)
    runIdRef.current = null
    assistantIdRef.current = null
  }, [running])

  return { messages, running, send, cancel, clear }
}
