import type { ProviderConfig } from './types'

const TIMEOUT_MS = 15_000

export interface ListModelsResult {
  ok: boolean
  models: string[]
  message?: string
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit
): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const text = await res.text()
    if (!text) return res.statusText
    try {
      const json = JSON.parse(text) as { error?: { message?: string } | string }
      if (typeof json.error === 'string') return json.error
      if (json.error?.message) return json.error.message
    } catch {
      /* ignore */
    }
    return text.slice(0, 200)
  } catch {
    return res.statusText
  }
}

export async function listModels(
  config: ProviderConfig,
  apiKey: string | undefined
): Promise<ListModelsResult> {
  try {
    if (config.type === 'openai' || config.type === 'groq') {
      if (!apiKey) return { ok: false, models: [], message: 'API key is required' }
      const baseUrl =
        config.type === 'openai'
          ? config.baseUrl?.replace(/\/$/, '') ?? 'https://api.openai.com/v1'
          : 'https://api.groq.com/openai/v1'
      const res = await fetchWithTimeout(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` }
      })
      if (!res.ok) return { ok: false, models: [], message: await readError(res) }
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      const ids = (data.data ?? []).map((m) => m.id)
      const filtered =
        config.type === 'openai'
          ? ids.filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id))
          : ids
      return { ok: true, models: filtered.sort() }
    }

    if (config.type === 'anthropic') {
      if (!apiKey) return { ok: false, models: [], message: 'API key is required' }
      const baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'https://api.anthropic.com'
      const res = await fetchWithTimeout(`${baseUrl}/v1/models?limit=100`, {
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01'
        }
      })
      if (!res.ok) return { ok: false, models: [], message: await readError(res) }
      const data = (await res.json()) as { data?: Array<{ id: string }> }
      return { ok: true, models: (data.data ?? []).map((m) => m.id) }
    }

    if (config.type === 'ollama') {
      const baseUrl = config.baseUrl?.replace(/\/$/, '') ?? 'http://localhost:11434'
      const res = await fetchWithTimeout(`${baseUrl}/api/tags`, {})
      if (!res.ok) return { ok: false, models: [], message: await readError(res) }
      const data = (await res.json()) as { models?: Array<{ name: string }> }
      return { ok: true, models: (data.models ?? []).map((m) => m.name).sort() }
    }

    return { ok: false, models: [], message: 'Unknown provider type' }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { ok: false, models: [], message: 'Timed out' }
    }
    return { ok: false, models: [], message: err instanceof Error ? err.message : String(err) }
  }
}
