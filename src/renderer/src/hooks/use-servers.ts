import { useCallback, useEffect, useState } from 'react'
import type { ServerView } from '@/lib/mcp-types'

export function useServers(): {
  servers: ServerView[]
  loading: boolean
  refresh: () => Promise<void>
} {
  const [servers, setServers] = useState<ServerView[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const list = await window.api.mcp.list()
    setServers(list)
  }, [])

  useEffect(() => {
    let active = true
    void window.api.mcp.list().then((list) => {
      if (!active) return
      setServers(list)
      setLoading(false)
    })

    const offUpdated = window.api.mcp.onServerUpdated((view) => {
      setServers((prev) => {
        const idx = prev.findIndex((s) => s.id === view.id)
        if (idx === -1) return [...prev, view]
        const next = [...prev]
        next[idx] = view
        return next
      })
    })
    const offRemoved = window.api.mcp.onServerRemoved((id) => {
      setServers((prev) => prev.filter((s) => s.id !== id))
    })

    return () => {
      active = false
      offUpdated()
      offRemoved()
    }
  }, [])

  return { servers, loading, refresh }
}

export function useServer(id: string | undefined): ServerView | undefined {
  const { servers } = useServers()
  return servers.find((s) => s.id === id)
}
