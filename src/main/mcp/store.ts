import Store from 'electron-store'
import type { ServerConfig } from './types'

interface Schema {
  servers: ServerConfig[]
}

const store = new Store<Schema>({
  name: 'mcp-lookup-config',
  defaults: { servers: [] }
})

export const ServerStore = {
  list(): ServerConfig[] {
    return store.get('servers', [])
  },
  get(id: string): ServerConfig | undefined {
    return store.get('servers', []).find((s) => s.id === id)
  },
  upsert(server: ServerConfig): void {
    const servers = store.get('servers', [])
    const idx = servers.findIndex((s) => s.id === server.id)
    if (idx >= 0) servers[idx] = server
    else servers.push(server)
    store.set('servers', servers)
  },
  remove(id: string): void {
    store.set(
      'servers',
      store.get('servers', []).filter((s) => s.id !== id)
    )
  }
}
