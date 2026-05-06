import { useEffect, useState } from 'react'
import type { ServerSummary } from '@/lib/chat-types'

export function useServerContext(): { summary: ServerSummary[]; refresh: () => void } {
  const [summary, setSummary] = useState<ServerSummary[]>([])

  const refresh = (): void => {
    void window.api.chat.serverContext().then(setSummary)
  }

  useEffect(() => {
    refresh()
    const off = window.api.mcp.onServerUpdated(() => refresh())
    return off
  }, [])

  return { summary, refresh }
}
