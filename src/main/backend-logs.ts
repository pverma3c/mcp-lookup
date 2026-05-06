import { EventEmitter } from 'node:events'
import type { LogLevel, LogLine } from './mcp/types'

const MAX = 500
const BACKEND_ID = '__main__'

const buffer: LogLine[] = []
export const backendEmitter = new EventEmitter()

function format(args: unknown[]): string {
  return args
    .map((a) => {
      if (typeof a === 'string') return a
      if (a instanceof Error) return a.stack ?? a.message
      try {
        return JSON.stringify(a, null, 2)
      } catch {
        return String(a)
      }
    })
    .join(' ')
}

function push(level: LogLevel, args: unknown[]): void {
  const message = format(args).trim()
  if (!message) return
  for (const part of message.split(/\r?\n/)) {
    if (!part) continue
    const line: LogLine = {
      serverId: BACKEND_ID,
      source: 'backend',
      message: part,
      timestamp: Date.now(),
      level
    }
    buffer.push(line)
    if (buffer.length > MAX) buffer.shift()
    backendEmitter.emit('log', line)
  }
}

export function getBackendLogs(): LogLine[] {
  return [...buffer]
}

export function clearBackendLogs(): void {
  buffer.length = 0
}

export function installBackendLogCapture(): void {
  const original = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console)
  }

  console.log = (...args: unknown[]): void => {
    push('log', args)
    original.log(...args)
  }
  console.info = (...args: unknown[]): void => {
    push('info', args)
    original.info(...args)
  }
  console.warn = (...args: unknown[]): void => {
    push('warn', args)
    original.warn(...args)
  }
  console.error = (...args: unknown[]): void => {
    push('error', args)
    original.error(...args)
  }

  process.on('uncaughtException', (err) => {
    push('error', ['uncaughtException:', err])
  })
  process.on('unhandledRejection', (reason) => {
    push('error', ['unhandledRejection:', reason])
  })
}
