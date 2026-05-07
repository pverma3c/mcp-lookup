import { BrowserWindow, ipcMain } from 'electron'
import { nanoid } from 'nanoid'
import { listModels } from './models'
import { ProviderStore } from './store'
import { testProvider } from './test'
import { LLM_CHANNELS } from './types'
import type { Provider, ProviderInput, TestRequest, UpdateProviderInput } from './types'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerLlmIpc(): void {
  ipcMain.handle(LLM_CHANNELS.list, () => ProviderStore.list())

  ipcMain.handle(LLM_CHANNELS.add, (_e, input: ProviderInput) => {
    const provider: Provider = ProviderStore.upsert({
      id: nanoid(10),
      name: input.name,
      config: input.config,
      apiKey: input.apiKey
    })
    broadcast(LLM_CHANNELS.providerUpdated, provider)
    return provider
  })

  ipcMain.handle(LLM_CHANNELS.update, (_e, input: UpdateProviderInput) => {
    const provider = ProviderStore.upsert({
      id: input.id,
      name: input.name,
      config: input.config,
      apiKey: input.apiKey,
      keepExistingKey: input.apiKey === undefined || input.apiKey === ''
    })
    broadcast(LLM_CHANNELS.providerUpdated, provider)
    return provider
  })

  ipcMain.handle(LLM_CHANNELS.remove, (_e, id: string) => {
    ProviderStore.remove(id)
    broadcast(LLM_CHANNELS.providerRemoved, id)
  })

  ipcMain.handle(LLM_CHANNELS.setEnabled, (_e, id: string, enabled: boolean) => {
    const provider = ProviderStore.setEnabled(id, enabled)
    if (provider) broadcast(LLM_CHANNELS.providerUpdated, provider)
    return provider
  })

  ipcMain.handle(LLM_CHANNELS.test, (_e, req: TestRequest) => {
    let key = req.apiKey
    if ((!key || key === '') && req.id) key = ProviderStore.getApiKey(req.id)
    return testProvider(req.config, key)
  })

  ipcMain.handle(LLM_CHANNELS.listModels, (_e, req: TestRequest) => {
    let key = req.apiKey
    if ((!key || key === '') && req.id) key = ProviderStore.getApiKey(req.id)
    return listModels(req.config, key)
  })
}
