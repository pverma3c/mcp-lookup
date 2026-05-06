import Store from 'electron-store'
import { safeStorage } from 'electron'
import type { Provider, ProviderConfig } from './types'

interface StoredProvider {
  id: string
  name: string
  config: ProviderConfig
  apiKey?: string
  apiKeyEncrypted?: boolean
}

interface Schema {
  providers: StoredProvider[]
}

const store = new Store<Schema>({
  name: 'mcp-lookup-providers',
  defaults: { providers: [] }
})

function encryptKey(key: string): { value: string; encrypted: boolean } {
  if (safeStorage.isEncryptionAvailable()) {
    return { value: safeStorage.encryptString(key).toString('base64'), encrypted: true }
  }
  return { value: key, encrypted: false }
}

function decryptKey(stored: StoredProvider): string | undefined {
  if (!stored.apiKey) return undefined
  if (stored.apiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      return safeStorage.decryptString(Buffer.from(stored.apiKey, 'base64'))
    } catch {
      return undefined
    }
  }
  return stored.apiKey
}

function toProvider(stored: StoredProvider): Provider {
  return {
    id: stored.id,
    name: stored.name,
    config: stored.config,
    hasApiKey: !!stored.apiKey
  }
}

export const ProviderStore = {
  list(): Provider[] {
    return store.get('providers', []).map(toProvider)
  },
  getRaw(id: string): StoredProvider | undefined {
    return store.get('providers', []).find((p) => p.id === id)
  },
  getApiKey(id: string): string | undefined {
    const raw = this.getRaw(id)
    return raw ? decryptKey(raw) : undefined
  },
  upsert(input: {
    id: string
    name: string
    config: ProviderConfig
    apiKey?: string
    keepExistingKey?: boolean
  }): Provider {
    const list = store.get('providers', [])
    const idx = list.findIndex((p) => p.id === input.id)
    const existing = idx >= 0 ? list[idx] : undefined

    let stored: StoredProvider
    if (input.apiKey !== undefined && input.apiKey !== '') {
      const { value, encrypted } = encryptKey(input.apiKey)
      stored = {
        id: input.id,
        name: input.name,
        config: input.config,
        apiKey: value,
        apiKeyEncrypted: encrypted
      }
    } else if (input.keepExistingKey && existing?.apiKey) {
      stored = {
        id: input.id,
        name: input.name,
        config: input.config,
        apiKey: existing.apiKey,
        apiKeyEncrypted: existing.apiKeyEncrypted
      }
    } else {
      stored = { id: input.id, name: input.name, config: input.config }
    }

    if (idx >= 0) list[idx] = stored
    else list.push(stored)
    store.set('providers', list)
    return toProvider(stored)
  },
  remove(id: string): void {
    store.set(
      'providers',
      store.get('providers', []).filter((p) => p.id !== id)
    )
  }
}
