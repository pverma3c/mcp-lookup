import { ChatAnthropic } from '@langchain/anthropic'
import { ChatGroq } from '@langchain/groq'
import { ChatOllama } from '@langchain/ollama'
import { ChatOpenAI } from '@langchain/openai'
import type { BaseChatModel } from '@langchain/core/language_models/chat_models'
import { ProviderStore } from '../llm/store'
import type { Provider } from '../llm/types'

export function buildModel(provider: Provider): BaseChatModel {
  const apiKey = ProviderStore.getApiKey(provider.id)

  if (provider.config.type === 'openai') {
    return new ChatOpenAI({
      apiKey,
      model: provider.config.model,
      streaming: true,
      configuration: provider.config.baseUrl ? { baseURL: provider.config.baseUrl } : undefined
    })
  }
  if (provider.config.type === 'anthropic') {
    return new ChatAnthropic({
      apiKey,
      model: provider.config.model,
      streaming: true,
      anthropicApiUrl: provider.config.baseUrl
    })
  }
  if (provider.config.type === 'groq') {
    return new ChatGroq({
      apiKey,
      model: provider.config.model,
      streaming: true
    })
  }
  return new ChatOllama({
    baseUrl: provider.config.baseUrl,
    model: provider.config.model
  })
}
