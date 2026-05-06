import { useEffect, useState } from 'react'
import type { LogLine } from '@/lib/mcp-types'

export function useServerLogs(serverId: string | undefined): {
  lines: LogLine[]
  clear: () => Promise<void>
} {
  const [lines, setLines] = useState<LogLine[]>([])

  useEffect(() => {
    if (!serverId) return
    let active = true
    void window.api.mcp.getLogs(serverId).then((existing) => {
      if (!active) return
      setLines(existing)
    })
    const off = window.api.mcp.onServerLog((line) => {
      if (line.serverId !== serverId) return
      setLines((prev) => {
        const next = [...prev, line]
        return next.length > 500 ? next.slice(next.length - 500) : next
      })
    })
    return () => {
      active = false
      off()
    }
  }, [serverId])

  const clear = async (): Promise<void> => {
    if (!serverId) return
    await window.api.mcp.clearLogs(serverId)
    setLines([])
  }

  return { lines, clear }
}
