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

export const LLM_CHANNELS = {
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
