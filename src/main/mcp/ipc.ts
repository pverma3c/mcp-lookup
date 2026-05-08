import { BrowserWindow, ipcMain } from 'electron'
import { backendEmitter, clearBackendLogs, getBackendLogs } from '../backend-logs'
import { mcpManager } from './manager'
import { MCP_CHANNELS } from './types'
import type { AddServerInput, LogLine, ServerView, UpdateServerInput } from './types'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerMcpIpc(): void {
  ipcMain.handle(MCP_CHANNELS.list, () => mcpManager.list())
  ipcMain.handle(MCP_CHANNELS.add, (_e, input: AddServerInput) => mcpManager.add(input))
  ipcMain.handle(MCP_CHANNELS.update, (_e, input: UpdateServerInput) => mcpManager.update(input))
  ipcMain.handle(MCP_CHANNELS.remove, (_e, id: string) => mcpManager.remove(id))
  ipcMain.handle(MCP_CHANNELS.connect, (_e, id: string) => mcpManager.connect(id))
  ipcMain.handle(MCP_CHANNELS.disconnect, (_e, id: string) => mcpManager.disconnect(id))
  ipcMain.handle(MCP_CHANNELS.cancelConnect, (_e, id: string) => mcpManager.cancelConnect(id))
  ipcMain.handle(
    MCP_CHANNELS.callTool,
    (_e, serverId: string, toolName: string, args: Record<string, unknown>) =>
      mcpManager.callTool(serverId, toolName, args)
  )
  ipcMain.handle(
    MCP_CHANNELS.toggleTool,
    (_e, id: string, toolName: string, disabled: boolean) =>
      mcpManager.toggleTool(id, toolName, disabled)
  )
  ipcMain.handle(
    MCP_CHANNELS.setAllTools,
    (_e, id: string, disabled: boolean) => mcpManager.setAllTools(id, disabled)
  )
  ipcMain.handle(MCP_CHANNELS.getLogs, (_e, id: string) => mcpManager.getLogs(id))
  ipcMain.handle(MCP_CHANNELS.getAllLogs, () => {
    const merged = [...mcpManager.getAllLogs(), ...getBackendLogs()]
    merged.sort((a, b) => a.timestamp - b.timestamp)
    return merged
  })
  ipcMain.handle(MCP_CHANNELS.clearLogs, (_e, id: string) => {
    if (id === '__main__') clearBackendLogs()
    else mcpManager.clearLogs(id)
  })

  mcpManager.on('updated', (view: ServerView) => broadcast(MCP_CHANNELS.serverUpdated, view))
  mcpManager.on('removed', (id: string) => broadcast(MCP_CHANNELS.serverRemoved, id))
  mcpManager.on('log', (line: LogLine) => broadcast(MCP_CHANNELS.serverLog, line))
  backendEmitter.on('log', (line: LogLine) => broadcast(MCP_CHANNELS.serverLog, line))
}
