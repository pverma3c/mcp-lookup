import { useEffect, useState } from 'react'
import type { Provider } from '@/lib/llm-types'

export function useProviders(): { providers: Provider[]; loading: boolean } {
  const [providers, setProviders] = useState<Provider[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    void window.api.llm.list().then((list) => {
      if (!active) return
      setProviders(list)
      setLoading(false)
    })

    const offUpdated = window.api.llm.onProviderUpdated((p) => {
      setProviders((prev) => {
        const idx = prev.findIndex((x) => x.id === p.id)
        if (idx === -1) return [...prev, p]
        const next = [...prev]
        next[idx] = p
        return next
      })
    })
    const offRemoved = window.api.llm.onProviderRemoved((id) => {
      setProviders((prev) => prev.filter((p) => p.id !== id))
    })

    return () => {
      active = false
      offUpdated()
      offRemoved()
    }
  }, [])

  return { providers, loading }
}
