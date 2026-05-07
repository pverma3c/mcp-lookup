export type UpdateState =
  | { status: 'idle'; current: string }
  | { status: 'checking'; current: string }
  | {
      status: 'available'
      current: string
      version: string
      releaseNotes?: string
      releaseName?: string
      releaseDate?: string
    }
  | { status: 'not-available'; current: string }
  | {
      status: 'downloading'
      current: string
      version: string
      percent: number
      bytesPerSecond: number
      transferred: number
      total: number
    }
  | {
      status: 'downloaded'
      current: string
      version: string
      releaseNotes?: string
      canInstall: boolean
    }
  | { status: 'error'; current: string; message: string }
