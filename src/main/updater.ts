import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { autoUpdater } from 'electron-updater'
import { is } from '@electron-toolkit/utils'
import type { UpdateState } from '../renderer/src/lib/update-types'

let state: UpdateState = { status: 'idle', current: app.getVersion() }

function broadcast(): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('update:state', state)
  }
}

function setState(next: UpdateState): void {
  state = next
  broadcast()
}

function notesToString(notes: unknown): string | undefined {
  if (!notes) return undefined
  if (typeof notes === 'string') return notes
  if (Array.isArray(notes)) {
    return notes
      .map((n) => (typeof n === 'string' ? n : (n?.note ?? '')))
      .filter(Boolean)
      .join('\n\n')
  }
  return undefined
}

// electron-updater can only apply updates to packaged builds. For .deb, the
// GitHub feed is read but the installer is left to the user — we open the
// release URL instead of trying to dpkg.
function canSelfInstall(): boolean {
  // AppImage exposes itself via env var; that's the one Linux target the
  // updater can swap automatically.
  if (process.platform === 'linux') return Boolean(process.env.APPIMAGE)
  return process.platform === 'win32' || process.platform === 'darwin'
}

export function registerUpdaterIpc(): void {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = false
  autoUpdater.logger = null

  autoUpdater.on('checking-for-update', () => {
    setState({ status: 'checking', current: app.getVersion() })
  })

  autoUpdater.on('update-available', (info) => {
    setState({
      status: 'available',
      current: app.getVersion(),
      version: info.version,
      releaseNotes: notesToString(info.releaseNotes),
      releaseName: info.releaseName ?? undefined,
      releaseDate: info.releaseDate ?? undefined
    })
  })

  autoUpdater.on('update-not-available', () => {
    setState({ status: 'not-available', current: app.getVersion() })
  })

  autoUpdater.on('download-progress', (p) => {
    const version = state.status === 'available' || state.status === 'downloading'
      ? (state as { version: string }).version
      : ''
    setState({
      status: 'downloading',
      current: app.getVersion(),
      version,
      percent: p.percent,
      bytesPerSecond: p.bytesPerSecond,
      transferred: p.transferred,
      total: p.total
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    setState({
      status: 'downloaded',
      current: app.getVersion(),
      version: info.version,
      releaseNotes: notesToString(info.releaseNotes),
      canInstall: canSelfInstall()
    })
  })

  autoUpdater.on('error', (err) => {
    setState({
      status: 'error',
      current: app.getVersion(),
      message: err?.message ?? String(err)
    })
  })

  ipcMain.handle('update:get-state', () => state)

  ipcMain.handle('update:check', async () => {
    if (is.dev) {
      setState({
        status: 'error',
        current: app.getVersion(),
        message: 'Updates are only available in packaged builds.'
      })
      return state
    }
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      setState({
        status: 'error',
        current: app.getVersion(),
        message: (err as Error)?.message ?? String(err)
      })
    }
    return state
  })

  ipcMain.handle('update:download', async () => {
    if (state.status !== 'available') return state
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      setState({
        status: 'error',
        current: app.getVersion(),
        message: (err as Error)?.message ?? String(err)
      })
    }
    return state
  })

  ipcMain.handle('update:install', () => {
    if (state.status !== 'downloaded') return state
    if (!canSelfInstall()) {
      void shell.openExternal('https://github.com/pverma3c/mcp-lookup/releases/latest')
      return state
    }
    setImmediate(() => autoUpdater.quitAndInstall())
    return state
  })

  ipcMain.handle('update:open-release', () => {
    void shell.openExternal('https://github.com/pverma3c/mcp-lookup/releases/latest')
  })

  if (!is.dev) {
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch(() => {
        /* surfaced via 'error' event */
      })
    }, 4000)
  }
}
