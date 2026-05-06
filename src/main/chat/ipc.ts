import { BrowserWindow, ipcMain } from 'electron'
import { chatManager } from './manager'
import { CHAT_CHANNELS } from './types'
import type { ChatEvent, SendChatRequest } from './types'

function broadcast(channel: string, payload: unknown): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(channel, payload)
  }
}

export function registerChatIpc(): void {
  ipcMain.handle(CHAT_CHANNELS.send, (_e, req: SendChatRequest) => chatManager.send(req))
  ipcMain.handle(CHAT_CHANNELS.cancel, (_e, runId: string) => chatManager.cancel(runId))
  ipcMain.handle(CHAT_CHANNELS.serverContext, () => chatManager.listServerContext())

  chatManager.on('event', (event: ChatEvent) => broadcast(CHAT_CHANNELS.event, event))
}
