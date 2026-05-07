export type ProviderType = 'openai' | 'anthropic' | 'groq' | 'ollama'

export interface OpenAIConfig {
  type: 'openai'
  baseUrl?: string
  model: string
}

export interface AnthropicConfig {
  type: 'anthropic'
  baseUrl?: string
  model: string
}

export interface GroqConfig {
  type: 'groq'
  model: string
}

export interface OllamaConfig {
  type: 'ollama'
  baseUrl: string
  model: string
}

export type ProviderConfig = OpenAIConfig | AnthropicConfig | GroqConfig | OllamaConfig

export interface Provider {
  id: string
  name: string
  config: ProviderConfig
  hasApiKey: boolean
  disabled: boolean
}

export interface ProviderInput {
  name: string
  config: ProviderConfig
  apiKey?: string
}

export interface UpdateProviderInput {
  id: string
  name: string
  config: ProviderConfig
  apiKey?: string
}

export const PROVIDER_LABELS: Record<ProviderType, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  groq: 'Groq',
  ollama: 'Ollama'
}

export const PROVIDER_DEFAULT_MODELS: Record<ProviderType, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-5',
  groq: 'llama-3.3-70b-versatile',
  ollama: 'llama3.1'
}

export const PROVIDER_NEEDS_API_KEY: Record<ProviderType, boolean> = {
  openai: true,
  anthropic: true,
  groq: true,
  ollama: false
}

export const OLLAMA_DEFAULT_BASE_URL = 'http://localhost:11434'

export interface TestRequest {
  config: ProviderConfig
  apiKey?: string
  id?: string
}

export interface TestResult {
  ok: boolean
  message: string
  latencyMs?: number
}

export interface ListModelsResult {
  ok: boolean
  models: string[]
  message?: string
}
