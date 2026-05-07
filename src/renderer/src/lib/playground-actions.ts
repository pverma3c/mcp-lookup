import { useSyncExternalStore } from 'react'

export interface PlaygroundActions {
  canRun: boolean
  running: boolean
  run: (() => void) | null
}

const empty: PlaygroundActions = { canRun: false, running: false, run: null }
let state: PlaygroundActions = empty
const listeners = new Set<() => void>()

export function setPlaygroundActions(next: PlaygroundActions): void {
  state = next
  for (const l of listeners) l()
}

export function clearPlaygroundActions(): void {
  setPlaygroundActions(empty)
}

export function usePlaygroundActions(): PlaygroundActions {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => {
        listeners.delete(cb)
      }
    },
    () => state,
    () => state
  )
}
