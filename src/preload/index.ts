import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const MCP_CHANNELS = {
  list: 'mcp:list',
  add: 'mcp:add',
  update: 'mcp:update',
  remove: 'mcp:remove',
  connect: 'mcp:connect',
  disconnect: 'mcp:disconnect',
  cancelConnect: 'mcp:cancel-connect',
  callTool: 'mcp:call-tool',
  toggleTool: 'mcp:toggle-tool',
  setAllTools: 'mcp:set-all-tools',
  getLogs: 'mcp:get-logs',
  getAllLogs: 'mcp:get-all-logs',
  clearLogs: 'mcp:clear-logs',
  serverUpdated: 'mcp:server-updated',
  serverRemoved: 'mcp:server-removed',
  serverLog: 'mcp:server-log'
} as const

const CHAT_CHANNELS = {
  send: 'chat:send',
  cancel: 'chat:cancel',
  serverContext: 'chat:server-context',
  event: 'chat:event'
} as const

const LLM_CHANNELS = {
  list: 'llm:list',
  add: 'llm:add',
  update: 'llm:update',
  remove: 'llm:remove',
  setEnabled: 'llm:set-enabled',
  test: 'llm:test',
  listModels: 'llm:list-models',
  providerUpdated: 'llm:provider-updated',
  providerRemoved: 'llm:provider-removed'
} as const

const mcpApi = {
  list: () => ipcRenderer.invoke(MCP_CHANNELS.list),
  add: (input: unknown) => ipcRenderer.invoke(MCP_CHANNELS.add, input),
  update: (input: unknown) => ipcRenderer.invoke(MCP_CHANNELS.update, input),
  remove: (id: string) => ipcRenderer.invoke(MCP_CHANNELS.remove, id),
  connect: (id: string) => ipcRenderer.invoke(MCP_CHANNELS.connect, id),
  disconnect: (id: string) => ipcRenderer.invoke(MCP_CHANNELS.disconnect, id),
  cancelConnect: (id: string) => ipcRenderer.invoke(MCP_CHANNELS.cancelConnect, id),
  callTool: (serverId: string, toolName: string, args: Record<string, unknown>) =>
    ipcRenderer.invoke(MCP_CHANNELS.callTool, serverId, toolName, args),
  toggleTool: (id: string, toolName: string, disabled: boolean) =>
    ipcRenderer.invoke(MCP_CHANNELS.toggleTool, id, toolName, disabled),
  setAllTools: (id: string, disabled: boolean) =>
    ipcRenderer.invoke(MCP_CHANNELS.setAllTools, id, disabled),
  getLogs: (id: string) => ipcRenderer.invoke(MCP_CHANNELS.getLogs, id),
  getAllLogs: () => ipcRenderer.invoke(MCP_CHANNELS.getAllLogs),
  clearLogs: (id: string) => ipcRenderer.invoke(MCP_CHANNELS.clearLogs, id),
  onServerLog: (cb: (line: unknown) => void) => {
    const handler = (_e: IpcRendererEvent, line: unknown): void => cb(line)
    ipcRenderer.on(MCP_CHANNELS.serverLog, handler)
    return () => ipcRenderer.off(MCP_CHANNELS.serverLog, handler)
  },
  onServerUpdated: (cb: (view: unknown) => void) => {
    const handler = (_e: IpcRendererEvent, view: unknown): void => cb(view)
    ipcRenderer.on(MCP_CHANNELS.serverUpdated, handler)
    return () => ipcRenderer.off(MCP_CHANNELS.serverUpdated, handler)
  },
  onServerRemoved: (cb: (id: string) => void) => {
    const handler = (_e: IpcRendererEvent, id: string): void => cb(id)
    ipcRenderer.on(MCP_CHANNELS.serverRemoved, handler)
    return () => ipcRenderer.off(MCP_CHANNELS.serverRemoved, handler)
  }
}

const llmApi = {
  list: () => ipcRenderer.invoke(LLM_CHANNELS.list),
  add: (input: unknown) => ipcRenderer.invoke(LLM_CHANNELS.add, input),
  update: (input: unknown) => ipcRenderer.invoke(LLM_CHANNELS.update, input),
  remove: (id: string) => ipcRenderer.invoke(LLM_CHANNELS.remove, id),
  setEnabled: (id: string, enabled: boolean) =>
    ipcRenderer.invoke(LLM_CHANNELS.setEnabled, id, enabled),
  test: (req: unknown) => ipcRenderer.invoke(LLM_CHANNELS.test, req),
  listModels: (req: unknown) => ipcRenderer.invoke(LLM_CHANNELS.listModels, req),
  onProviderUpdated: (cb: (p: unknown) => void) => {
    const handler = (_e: IpcRendererEvent, p: unknown): void => cb(p)
    ipcRenderer.on(LLM_CHANNELS.providerUpdated, handler)
    return () => ipcRenderer.off(LLM_CHANNELS.providerUpdated, handler)
  },
  onProviderRemoved: (cb: (id: string) => void) => {
    const handler = (_e: IpcRendererEvent, id: string): void => cb(id)
    ipcRenderer.on(LLM_CHANNELS.providerRemoved, handler)
    return () => ipcRenderer.off(LLM_CHANNELS.providerRemoved, handler)
  }
}

const chatApi = {
  send: (req: unknown) => ipcRenderer.invoke(CHAT_CHANNELS.send, req),
  cancel: (runId: string) => ipcRenderer.invoke(CHAT_CHANNELS.cancel, runId),
  serverContext: () => ipcRenderer.invoke(CHAT_CHANNELS.serverContext),
  onEvent: (cb: (event: unknown) => void) => {
    const handler = (_e: IpcRendererEvent, event: unknown): void => cb(event)
    ipcRenderer.on(CHAT_CHANNELS.event, handler)
    return () => ipcRenderer.off(CHAT_CHANNELS.event, handler)
  }
}

const updateApi = {
  getState: () => ipcRenderer.invoke('update:get-state'),
  check: () => ipcRenderer.invoke('update:check'),
  download: () => ipcRenderer.invoke('update:download'),
  install: () => ipcRenderer.invoke('update:install'),
  openRelease: () => ipcRenderer.invoke('update:open-release'),
  onState: (cb: (state: unknown) => void) => {
    const handler = (_e: IpcRendererEvent, s: unknown): void => cb(s)
    ipcRenderer.on('update:state', handler)
    return () => ipcRenderer.off('update:state', handler)
  }
}

const windowApi = {
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximizeToggle: () => ipcRenderer.invoke('window:maximize-toggle'),
  close: () => ipcRenderer.invoke('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (cb: (isMaximized: boolean) => void) => {
    const handler = (_e: IpcRendererEvent, v: boolean): void => cb(v)
    ipcRenderer.on('window:maximized', handler)
    return () => ipcRenderer.off('window:maximized', handler)
  }
}

const api = {
  mcp: mcpApi,
  llm: llmApi,
  chat: chatApi,
  win: windowApi,
  update: updateApi
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
