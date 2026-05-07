import { useEffect, useState } from 'react'
import type { UpdateState } from '@/lib/update-types'

export function useUpdate(): {
  state: UpdateState
  check: () => Promise<void>
  download: () => Promise<void>
  install: () => Promise<void>
  openRelease: () => Promise<void>
} {
  const [state, setState] = useState<UpdateState>({ status: 'idle', current: '' })

  useEffect(() => {
    let active = true
    void window.api.update.getState().then((s) => {
      if (active) setState(s)
    })
    const off = window.api.update.onState((s) => setState(s))
    return () => {
      active = false
      off()
    }
  }, [])

  return {
    state,
    check: async () => {
      await window.api.update.check()
    },
    download: async () => {
      await window.api.update.download()
    },
    install: async () => {
      await window.api.update.install()
    },
    openRelease: async () => {
      await window.api.update.openRelease()
    }
  }
}
