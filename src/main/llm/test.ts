import type { ProviderConfig } from './types'
import type { TestResult } from './types'

const DEFAULT_TIMEOUT_MS = 15_000

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (!text) return res.statusText
    try {
      const json = JSON.parse(text) as { error?: { message?: string } | string }
      if (typeof json.error === 'string') return json.error
      if (json.error?.message) return json.error.message
    } catch {
      /* not JSON */
    }
    return text.slice(0, 200)
  } catch {
    return res.statusText
  }
}

export async function testProvider(
  config: ProviderConfig,
  apiKey: string | undefined
): Promise<TestResult> {
  const start = Date.now()
  try {
    if (config.type === 'openai' || config.type === 'groq') {
      if (!apiKey) return { ok: false, message: 'API key is required' }
      const baseUrl =
        config.type === 'openai'
          ? config.baseUrl?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
          : 'https://api.groq.com/openai/v1'
      const res = await fetchWithTimeout(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      if (!res.ok) {
        return { ok: false, message: `HTTP ${res.status}: ${await readErrorBody(res)}` }
      }
      return { ok: true, message: 'Authenticated', latencyMs: Date.now() - start }
    }

    if (config.type === 'anthropic') {
      if (!apiKey) return { ok: false, message: 'API key is required' }
      const baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'https://api.anthropic.com'
      const res = await fetchWithTimeout(`${baseUrl}/v1/models`, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      })
      if (!res.ok) {
        return { ok: false, message: `HTTP ${res.status}: ${await readErrorBody(res)}` }
      }
      return { ok: true, message: 'Authenticated', latencyMs: Date.now() - start }
    }

    if (config.type === 'ollama') {
      const baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'http://localhost:11434'
      const res = await fetchWithTimeout(`${baseUrl}/api/tags`, {})
      if (!res.ok) {
        return { ok: false, message: `HTTP ${res.status}: ${await readErrorBody(res)}` }
      }
      const data = (await res.json().catch(() => ({}))) as { models?: unknown[] }
      const count = data.models?.length ?? 0
      return {
        ok: true,
        message: `Reachable — ${count} model${count === 1 ? '' : 's'} available`,
        latencyMs: Date.now() - start
      }
    }

    return { ok: false, message: 'Unknown provider type' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, message: `Timed out after ${DEFAULT_TIMEOUT_MS}ms` }
    }
    return { ok: false, message: err instanceof Error ? err.message : String(err) }
  }
}
